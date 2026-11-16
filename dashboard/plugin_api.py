"""Agents monitor backend: one aggregate endpoint assembling live activity from durable state.

Read-only sources (no writes, no locks held):
  * ``state.db`` — ``gateway_routing`` (active-turn markers, route names), ``async_delegations``
    (live/recent delegations with parent sessions), ``sessions`` (parent_session_id chains → depth).
  * ``~/.hermes/cache/delegation/live/<id>/manifest.json`` — per-task status/goals of live units.
  * ``~/.hermes/processes.json`` — the background-process registry checkpoint.

All blocking I/O runs via ``asyncio.to_thread`` so the dashboard event loop is never held.
"""
from __future__ import annotations

import asyncio
import json
import math
import os
import sqlite3
import threading
import time
from datetime import datetime

from fastapi import APIRouter

router = APIRouter()


def _ts(value) -> float | None:
    """Coerce a stored timestamp — epoch float or ISO-8601 string — to epoch seconds."""
    if value is None or value == "":
        return None
    try:
        result = float(value)
        return result if math.isfinite(result) else None
    except (TypeError, ValueError):
        pass
    try:
        result = datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
        return result if math.isfinite(result) else None
    except (TypeError, ValueError, OverflowError, OSError):
        return None


def _duration(started, finished, now: float, live: bool) -> float | None:
    """Never let completed work tick onward or missing timestamps become huge ages."""
    end = now if live else finished
    if started is None or end is None:
        return None
    return round(max(0.0, end - started), 1)

_HISTORY_WINDOW_SECONDS = 15 * 60.0
_HISTORY_APPENDS_BETWEEN_PRUNES = 40
_SAMPLER_INTERVAL_SECONDS = 3.0
_history_appends = 0
_RECENT_SESSION_SECONDS = 120.0
_RECENT_DONE_DELEGATIONS = 20
_MIN_DONE_AGE_SECONDS = 1800.0


def _hermes_home() -> str:
    try:
        from hermes_constants import get_hermes_home

        return str(get_hermes_home())
    except Exception:
        return os.path.expanduser("~/.hermes")


def _db_connect(home: str) -> sqlite3.Connection:
    con = sqlite3.connect(f"file:{home}/state.db?mode=ro", uri=True, timeout=5)
    con.row_factory = sqlite3.Row
    return con


def _routing_entries(con: sqlite3.Connection) -> dict:
    """Route entries by session key — display names, platforms and active-turn markers."""
    entries: dict = {}
    try:
        for row in con.execute("SELECT session_key, entry_json, updated_at FROM gateway_routing"):
            try:
                data = json.loads(row["entry_json"] or "{}")
            except Exception:
                continue
            if not isinstance(data, dict):
                continue
            entries[row["session_key"]] = {
                "session_key": row["session_key"],
                "session_id": data.get("session_id"),
                "display_name": data.get("display_name"),
                "platform": data.get("platform"),
                "chat_type": data.get("chat_type"),
                "active_turn_token": data.get("active_turn_token"),
                "active_turn_started_at": data.get("active_turn_started_at"),
                "updated_at": row["updated_at"],
                "suspended": bool(data.get("suspended")),
            }
    except sqlite3.Error:
        pass
    return entries


def _active_turns(entries: dict, now: float) -> list:
    turns = []
    for entry in entries.values():
        started = _ts(entry.get("active_turn_started_at"))
        token = entry.get("active_turn_token")
        active = bool(token and started is not None)
        updated = _ts(entry.get("updated_at")) or 0.0
        if not (active or now - updated <= _RECENT_SESSION_SECONDS):
            continue
        turns.append({
            "session_key": entry.get("session_key"),
            "display_name": entry.get("display_name"),
            "platform": entry.get("platform"),
            "chat_type": entry.get("chat_type"),
            "in_turn": active,
            "turn_started_at": started,
            "elapsed_s": round(max(0.0, now - (started if active else updated)), 1),
            "last_active_at": updated,
        })
    turns.sort(key=lambda t: -(t.get("elapsed_s") or 0))
    return turns


def _delegation_depth(con: sqlite3.Connection, session_id, cache: dict) -> int:
    """Depth of a session: 0 for a main chat, +1 per subagent ancestor in the chain."""
    depth, sid, seen = 0, session_id, set()
    while sid and sid not in seen:
        seen.add(sid)
        if sid in cache:
            depth += cache[sid]
            break
        row = None
        try:
            row = con.execute(
                "SELECT parent_session_id, source FROM sessions WHERE id = ?", (sid,)).fetchone()
        except sqlite3.Error:
            break
        if row is None or not row["parent_session_id"]:
            cache[sid] = depth
            return depth
        if (row["source"] or "") == "subagent":
            depth += 1
        sid = row["parent_session_id"]
    cache[session_id] = depth
    return depth


def _live_manifest(home: str, delegation_id: str) -> dict:
    if not isinstance(delegation_id, str) or not delegation_id or any(
        character not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-"
        for character in delegation_id
    ):
        return {}
    path = os.path.join(home, "cache", "delegation", "live", delegation_id, "manifest.json")
    try:
        with open(path, encoding="utf-8") as handle:
            result = json.load(handle)
            return result if isinstance(result, dict) else {}
    except Exception:
        return {}


def _delegation_tasks(manifest: dict, task: dict, state: str, live: bool,
                      dispatched, completed, now: float) -> list:
    """Preserve task timing when present; mark shared-start fallback explicitly."""
    manifest_tasks = manifest.get("tasks")
    sources = manifest_tasks if isinstance(manifest_tasks, list) else []
    if not sources:
        goals = task.get("goals")
        goals = goals if isinstance(goals, list) else [task.get("goal")] if task.get("goal") else []
        sources = [{"index": index, "goal": goal} for index, goal in enumerate(goals[:50])]
    tasks = []
    for entry in sources[:50]:
        if not isinstance(entry, dict):
            continue
        status = entry.get("status") or ("running" if live else state)
        if not live and status in ("running", "pending", "queued", "finalizing"):
            status = state
        own_start = _ts(entry.get("started_at"))
        if own_start is None:
            own_start = _ts(entry.get("started"))
        started = own_start if own_start is not None else _ts(manifest.get("started"))
        started = started if started is not None else dispatched
        finished = _ts(entry.get("completed_at"))
        if finished is None:
            finished = _ts(entry.get("finished_at"))
        if finished is None:
            finished = _ts(entry.get("completed"))
        if finished is None and status not in ("running", "pending", "queued", "finalizing"):
            finished = _ts(manifest.get("completed"))
            finished = finished if finished is not None else completed
        task_live = live and status in ("running", "finalizing")
        tasks.append({
            "index": entry.get("index", len(tasks)),
            "goal": str(entry.get("goal") or "")[:160],
            "status": status,
            "model": entry.get("model") or manifest.get("model") or task.get("model"),
            "started_at": started,
            "completed_at": finished,
            "elapsed_s": _duration(started, finished, now, task_live),
            "timing_scope": "task" if own_start is not None else "delegation",
        })
    return tasks


def _delegations(con: sqlite3.Connection, entries: dict, home: str, now: float) -> list:
    units = []
    depth_cache: dict = {}
    route_by_session_id = {e.get("session_id"): e for e in entries.values()}
    try:
        # Normalize mixed SQLite epoch/ISO storage before filtering and ordering.
        con.create_function("am_timestamp", 1, _ts, deterministic=True)
        updated_epoch = "am_timestamp(updated_at)"
        rows = con.execute(
            "SELECT delegation_id, origin_session, parent_session_id, state, delivery_state,"
            " dispatched_at, completed_at, updated_at, task_json FROM async_delegations"
            " WHERE state IN ('running','finalizing')"
            f"    OR (state NOT IN ('running','finalizing') AND {updated_epoch} >= ?)"
            f" ORDER BY CASE WHEN state IN ('running','finalizing') THEN 0 ELSE 1 END,"
            f" {updated_epoch} DESC LIMIT 200",
            (now - _MIN_DONE_AGE_SECONDS,)).fetchall()
    except sqlite3.Error:
        return units
    for row in rows:
        state = row["state"] or ""
        live = state in ("running", "finalizing")
        if not live and len([u for u in units if not u.get("live")]) >= _RECENT_DONE_DELEGATIONS:
            continue
        try:
            task = json.loads(row["task_json"] or "{}")
        except Exception:
            task = {}
        task = task if isinstance(task, dict) else {}
        manifest = _live_manifest(home, row["delegation_id"])
        manifest_at = 0.0
        try:
            manifest_at = os.path.getmtime(os.path.join(
                home, "cache", "delegation", "live", row["delegation_id"], "manifest.json"))
        except OSError:
            pass
        dispatched = _ts(row["dispatched_at"])
        completed = _ts(row["completed_at"])
        tasks = _delegation_tasks(manifest, task, state, live, dispatched, completed, now)
        if live:
            for task_row in tasks:
                if task_row.get("status") in ("running", "finalizing"):
                    last = _last_line(os.path.join(
                        home, "cache", "delegation", "live", row["delegation_id"],
                        f"task-{task_row.get('index')}.log"))
                    if last:
                        task_row["last_line"] = last
        parent_route = route_by_session_id.get(row["parent_session_id"]) or {}
        parent_key = row["origin_session"] or parent_route.get("session_key") or ""
        parent_entry = entries.get(parent_key) or parent_route
        units.append({
            "delegation_id": row["delegation_id"],
            "live": live,
            "state": state,
            "delivery_state": row["delivery_state"],
            "parent_session_id": row["parent_session_id"],
            "parent_route": parent_key,
            "parent_name": parent_entry.get("display_name") or parent_key,
            "parent_platform": parent_entry.get("platform"),
            "depth": _delegation_depth(con, row["parent_session_id"], depth_cache),
            "dispatched_at": dispatched,
            "completed_at": completed,
            "last_activity": (max(manifest_at, _ts(row["updated_at"]) or 0.0) or None),
            "elapsed_s": _duration(dispatched, completed, now, live),
            "task_count": len(tasks),
            "tasks": tasks,
        })
    return units


def _proc_resources(pid: int, started, now: float):
    """(rss_mb, cpu_avg_pct) for a running pid on Linux; (None, None) elsewhere."""
    rss_mb = None
    cpu_pct = None
    try:
        with open(f"/proc/{pid}/status", encoding="utf-8", errors="replace") as handle:
            for line in handle:
                if line.startswith("VmRSS:"):
                    rss_mb = round(int(line.split()[1]) / 1024.0, 1)
                    break
    except (OSError, ValueError, IndexError):
        return None, None
    try:
        with open(f"/proc/{pid}/stat", encoding="utf-8", errors="replace") as handle:
            fields = handle.read().rsplit(")", 1)[1].split()
        utime, stime = int(fields[11]), int(fields[12])
        clock = os.sysconf("SC_CLK_TCK") or 100
        if started and now > started:
            cpu_pct = round((utime + stime) / clock / (now - started) * 100.0, 1)
    except (OSError, ValueError, IndexError):
        pass
    return rss_mb, cpu_pct


def _tail_file(path: str, max_bytes: int, lines: int) -> list:
    """Bounded tail read: last `lines` non-empty lines of the final `max_bytes`."""
    try:
        size = os.path.getsize(path)
        with open(path, "rb") as handle:
            if size > max_bytes:
                handle.seek(-max_bytes, os.SEEK_END)
                data = handle.read().decode("utf-8", errors="replace")
                if "\n" in data:
                    data = data.split("\n", 1)[1]
            else:
                data = handle.read().decode("utf-8", errors="replace")
    except OSError:
        return []
    return [line for line in data.splitlines() if line.strip()][-max(1, int(lines)):]


def _last_line(path: str, limit: int = 160) -> str | None:
    """One-line 'doing right now' hint from a log file (bounded read)."""
    lines = _tail_file(path, 4096, 1)
    if not lines:
        return None
    text = lines[-1].strip()
    return text[:limit] if text else None


def _processes(home: str, now: float) -> list:
    path = os.path.join(home, "processes.json")
    try:
        with open(path, encoding="utf-8") as handle:
            rows = json.load(handle)
    except Exception:
        return []
    if isinstance(rows, dict):
        rows = list(rows.values())
    if not isinstance(rows, list):
        return []
    out = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        status = row.get("status") or ("running" if not row.get("exited_epoch") else "exited")
        started = _ts(row.get("started_at"))
        exited = _ts(row.get("exited_epoch"))
        if status != "running" and (exited is None or now - exited > 60):
            continue
        out.append({
            "process_id": row.get("session_id") or row.get("id"),
            "command": str(row.get("command") or ""),
            "status": status,
            "started_at": started,
            "finished_at": exited,
            "elapsed_s": _duration(started, exited, now, status == "running"),
            "exit_code": row.get("exit_code"),
        })
        pid = row.get("pid")
        if status == "running" and isinstance(pid, int) and pid > 0:
            out[-1]["rss_mb"], out[-1]["cpu_avg_pct"] = _proc_resources(pid, started, now)
        if status == "running":
            log_path = row.get("output_log") or os.path.join(
                home, "logs", "process-output", f"{row.get('session_id')}.log")
            if isinstance(log_path, str) and log_path and os.path.isfile(log_path):
                last = _last_line(log_path)
                if last:
                    out[-1]["last_line"] = last
    out.sort(key=lambda p: -(p.get("elapsed_s") or 0))
    return out[:100]


def _history_path(home: str) -> str:
    return os.path.join(home, "cache", "agents-monitor-history.jsonl")


def _read_history(home: str, now: float) -> list:
    """Recent activity samples (survives page closes; enables graph history on open)."""
    try:
        with open(_history_path(home), encoding="utf-8") as handle:
            raw = [line for line in handle if line.strip()]
    except OSError:
        return []
    cutoff = now - _HISTORY_WINDOW_SECONDS
    samples = []
    for line in raw[-600:]:
        try:
            entry = json.loads(line)
        except Exception:
            continue
        if isinstance(entry, dict) and entry.get("t") and float(entry["t"]) >= cutoff:
            samples.append(entry)
    return samples[-300:]


def _append_history(home: str, now: float, counts: dict) -> None:
    global _history_appends
    sample = {"t": round(now, 3)}
    for key in ("turns", "live_delegations", "subagents", "processes"):
        sample[key] = int(counts.get(key) or 0)
    path = _history_path(home)
    try:
        with open(path, "a", encoding="utf-8") as handle:
            handle.write(json.dumps(sample) + "\n")
        _history_appends += 1
        if _history_appends % _HISTORY_APPENDS_BETWEEN_PRUNES == 0:
            kept = _read_history(home, now)
            tmp = path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as handle:
                for entry in kept:
                    handle.write(json.dumps(entry) + "\n")
            os.replace(tmp, path)
    except OSError:
        pass


_SERIES = ("turns", "live_delegations", "subagents", "processes")
_MINUTE_KEEP = 1500
_HOUR_KEEP = 744
_rollup_state: dict = {"minute": None, "hour": None}


def _rollup_path(home: str, kind: str) -> str:
    return os.path.join(home, "cache", f"agents-monitor-rollups-{kind}.jsonl")


def _read_rollups(home: str, kind: str, since: float) -> list:
    """Minute/hour rollups, oldest first, filtered to ``since``."""
    try:
        with open(_rollup_path(home, kind), encoding="utf-8") as handle:
            entries = []
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except Exception:
                    continue
                if isinstance(entry, dict) and float(entry.get("t") or 0) >= since:
                    entries.append(entry)
            return entries
    except OSError:
        return []


def _append_rollup(home: str, kind: str, entry: dict, keep: int) -> None:
    path = _rollup_path(home, kind)
    try:
        with open(path, "a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry) + "\n")
    except OSError:
        return
    try:
        with open(path, encoding="utf-8") as handle:
            lines = [line for line in handle if line.strip()]
        if len(lines) > keep + 60:
            tmp = path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as handle:
                handle.writelines(lines[-keep:])
            os.replace(tmp, path)
    except OSError:
        pass


def _last_rollup_bucket(path: str, size: float):
    """Bucket index (epoch // size) of the newest rollup entry in a file."""
    try:
        with open(path, encoding="utf-8") as handle:
            last = None
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except Exception:
                    continue
                if isinstance(entry, dict) and entry.get("t"):
                    last = float(entry["t"])
        return int(last // size) if last is not None else None
    except OSError:
        return None


def _fold(rows, t, nested_max=False):
    """Average + peak of a bucket of rows (minute rollups carry m_* peaks)."""
    if not rows:
        return None
    entry = {"t": t}
    for key in _SERIES:
        values = [float(r.get(key) or 0) for r in rows]
        entry[key] = round(sum(values) / len(values), 2)
        peaks = [float(r.get("m_" + key) or 0) for r in rows] if nested_max else values
        entry["m_" + key] = max(peaks)
    return entry


def _rollup(home: str, now: float) -> None:
    """Fold finished minutes/hours of raw history into durable rollups.

    Raw history only keeps a 15-minute window, so minute rollups are the
    mid-term store (24 hours) and hour rollups the long-term one (30 days).
    """
    now_min = int(now // 60)
    if _rollup_state["minute"] is None:
        _rollup_state["minute"] = _last_rollup_bucket(_rollup_path(home, "minute"), 60)
        if _rollup_state["minute"] is None:
            raw = _read_history(home, now)
            # bootstrap from the oldest raw sample: fold every minute we still have
            _rollup_state["minute"] = (int(float(raw[0]["t"]) // 60) - 1) if raw else now_min - 1
    if now_min > _rollup_state["minute"]:
        try:
            with open(_history_path(home), encoding="utf-8") as handle:
                raw_all = []
                for line in handle:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        raw_all.append(json.loads(line))
                    except Exception:
                        continue
        except OSError:
            raw_all = []
        for minute in range(_rollup_state["minute"] + 1, now_min):
            rows = [r for r in raw_all if minute * 60 <= float(r.get("t") or 0) < (minute + 1) * 60]
            entry = _fold(rows, minute * 60)
            if entry:
                _append_rollup(home, "minute", entry, _MINUTE_KEEP)
            _rollup_state["minute"] = minute
    now_hour = int(now // 3600)
    if _rollup_state["hour"] is None:
        _rollup_state["hour"] = _last_rollup_bucket(_rollup_path(home, "hour"), 3600)
        if _rollup_state["hour"] is None:
            # allow folding the last finished hour as soon as its minutes exist
            _rollup_state["hour"] = now_hour - 2
    if now_hour > _rollup_state["hour"]:
        minutes = _read_rollups(home, "minute", 0.0)
        for hour in range(_rollup_state["hour"] + 1, now_hour):
            rows = [m for m in minutes if hour * 3600 <= float(m.get("t") or 0) < (hour + 1) * 3600]
            entry = _fold(rows, hour * 3600, nested_max=True)
            if entry:
                _append_rollup(home, "hour", entry, _HOUR_KEEP)
            _rollup_state["hour"] = hour


def _snapshot() -> dict:
    """One read of the durable state: counts plus the row payloads."""
    now = time.time()
    home = _hermes_home()
    con = _db_connect(home)
    try:
        entries = _routing_entries(con)
        active_turns = _active_turns(entries, now)
        delegations = _delegations(con, entries, home, now)
    finally:
        con.close()
    processes = _processes(home, now)
    counts = {
        "turns": sum(1 for turn in active_turns if turn.get("in_turn")),
        "live_delegations": len([d for d in delegations if d.get("live")]),
        "subagents": sum(d.get("task_count") or 0 for d in delegations if d.get("live")),
        "processes": len([p for p in processes if p.get("status") == "running"]),
    }
    return {
        "now": now,
        "home": home,
        "active_turns": active_turns,
        "delegations": delegations,
        "processes": processes,
        "counts": counts,
    }


def _collect() -> dict:
    snapshot = _snapshot()
    return {
        "generated_at": snapshot["now"],
        "active_turns": snapshot["active_turns"],
        "delegations": snapshot["delegations"],
        "processes": snapshot["processes"],
        "counts": snapshot["counts"],
        "history": _read_history(snapshot["home"], snapshot["now"]),
    }


def _history_sampler() -> None:
    """Record activity every few seconds even when nobody has the page open,
    so the chart keeps its timeline across refreshes and idle periods."""
    while True:
        time.sleep(_SAMPLER_INTERVAL_SECONDS)
        try:
            snapshot = _snapshot()
            _append_history(snapshot["home"], snapshot["now"], snapshot["counts"])
            _rollup(snapshot["home"], snapshot["now"])
        except Exception:
            pass


threading.Thread(target=_history_sampler, name="agents-monitor-history", daemon=True).start()


@router.get("/overview")
async def overview():
    return await asyncio.to_thread(_collect)


_HISTORY_RANGES = {"12m": 720.0, "1h": 3600.0, "24h": 86400.0, "7d": 604800.0, "30d": 2592000.0}


def _collect_history(rng: str) -> dict:
    """Series plus analysis stats for a time range, from raw samples or rollups."""
    seconds = _HISTORY_RANGES.get(rng)
    if seconds is None:
        return {"ok": False, "error": "unknown range"}
    now = time.time()
    home = _hermes_home()
    if rng == "12m":
        rows = _read_history(home, now)
        interval = 3.0
    elif rng in ("1h", "24h"):
        rows = _read_rollups(home, "minute", now - seconds)
        interval = 60.0
    else:
        rows = _read_rollups(home, "hour", now - seconds)
        interval = 3600.0
    points = []
    for entry in rows:
        row = {"t": float(entry.get("t") or 0)}
        for key in _SERIES:
            row[key] = round(float(entry.get(key) or 0), 2)
        points.append(row)
    if len(points) > 480:
        bucket = -(-len(points) // 480)
        merged = []
        for index in range(0, len(points), bucket):
            group = points[index:index + bucket]
            row = {"t": group[0]["t"]}
            for key in _SERIES:
                row[key] = round(sum(g[key] for g in group) / len(group), 2)
            merged.append(row)
        points = merged
    stats = {"peaks": {}, "peaks_at": {}, "averages": {}, "hours": {}}
    if points:
        for key in _SERIES:
            values = [p[key] for p in points]
            peak_index = max(range(len(values)), key=lambda i: values[i])
            stats["peaks"][key] = values[peak_index]
            stats["peaks_at"][key] = points[peak_index]["t"]
            stats["averages"][key] = round(sum(values) / len(values), 2)
            stats["hours"][key] = round(sum(values) * interval / 3600.0, 1)
    if rng in ("24h", "7d", "30d"):
        best, best_total = None, -1.0
        for entry in _read_rollups(home, "hour", 0.0):
            total = sum(float(entry.get(key) or 0) for key in _SERIES)
            if total > best_total:
                best, best_total = entry, total
        if best and best_total > 0:
            stats["busiest_hour"] = time.strftime("%H:%M", time.localtime(float(best["t"])))
    return {"ok": True, "range": rng, "interval": interval, "points": points, "stats": stats}


@router.get("/history")
async def history(range: str = "12m"):
    return await asyncio.to_thread(_collect_history, range)


def _read_transcript(delegation: str, task, lines) -> dict:
    """Tail of a live delegation task transcript — strict path guard, read-only."""
    if not isinstance(delegation, str) or not delegation or any(
        character not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-"
        for character in delegation
    ):
        return {"ok": False, "error": "invalid delegation id"}
    try:
        task = int(task)
        lines = max(5, min(int(lines or 40), 200))
    except (TypeError, ValueError):
        return {"ok": False, "error": "invalid arguments"}
    if not 0 <= task < 64:
        return {"ok": False, "error": "task index out of range"}
    home = _hermes_home()
    base = os.path.realpath(os.path.join(home, "cache", "delegation", "live", delegation))
    path = os.path.realpath(os.path.join(base, f"task-{task}.log"))
    if not path.startswith(base + os.sep) or not os.path.isfile(path):
        return {"ok": False, "error": "transcript not found"}
    try:
        size = os.path.getsize(path)
        with open(path, "rb") as handle:
            if size > 32768:
                handle.seek(-32768, os.SEEK_END)
                data = handle.read().decode("utf-8", errors="replace")
                if "\n" in data:
                    data = data.split("\n", 1)[1]
            else:
                data = handle.read().decode("utf-8", errors="replace")
    except OSError as exc:
        return {"ok": False, "error": f"unreadable transcript: {exc}"}
    return {"ok": True, "task": task, "lines": [line for line in data.splitlines() if line.strip()][-lines:]}


@router.get("/transcript")
async def transcript(delegation: str, task: int = 0, lines: int = 40):
    return await asyncio.to_thread(_read_transcript, delegation, task, lines)


def _read_process_log(process_id: str, lines: int) -> dict:
    """Tail of a background process's output log (registry-resolved path only)."""
    if not isinstance(process_id, str) or not process_id or any(
        character not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-"
        for character in process_id
    ):
        return {"ok": False, "error": "invalid process id"}
    try:
        lines = max(5, min(int(lines or 40), 200))
    except (TypeError, ValueError):
        return {"ok": False, "error": "invalid arguments"}
    home = _hermes_home()
    try:
        with open(os.path.join(home, "processes.json"), encoding="utf-8") as handle:
            rows = json.load(handle)
    except Exception:
        return {"ok": False, "error": "process registry unreadable"}
    if isinstance(rows, dict):
        rows = list(rows.values())
    if not isinstance(rows, list):
        return {"ok": False, "error": "process registry unreadable"}
    for row in rows:
        if not (isinstance(row, dict) and row.get("session_id") == process_id):
            continue
        log_path = row.get("output_log") or os.path.join(
            home, "logs", "process-output", f"{process_id}.log")
        if not isinstance(log_path, str) or not log_path:
            return {"ok": False, "error": "no output log for this process"}
        real = os.path.realpath(log_path)
        if not os.path.isfile(real):
            return {"ok": False, "error": "output log not found"}
        return {"ok": True, "lines": _tail_file(real, 32768, lines)}
    return {"ok": False, "error": "process not found"}


@router.get("/process-log")
async def process_log(process_id: str, lines: int = 40):
    return await asyncio.to_thread(_read_process_log, process_id, lines)
