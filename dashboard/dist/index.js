(function () {
  "use strict";
  var SDK = window.__HERMES_PLUGIN_SDK__;
  if (!SDK) return;
  var React = SDK.React;
  var h = React.createElement;
  var hooks = SDK.hooks;
  var C = SDK.components;
var AGENTS_MONITOR_CSS = ".am-root {\n  --am-card: var(--color-card, var(--card));\n  --am-text: var(--color-card-foreground, var(--card-foreground, #eef4f8));\n  --am-muted: var(--color-muted-foreground, var(--muted-foreground, #b6c6d2));\n  --am-border: var(--color-border, var(--border));\n  color: var(--am-text); display: flex; flex-direction: column; gap: 1rem; width: 100%; min-width: 0;\n}\n.am-root *, .am-root *::before, .am-root *::after { box-sizing: border-box; }\n.am-page-header, .am-heading-line, .am-stat-label, .am-stat-bottom, .am-row, .am-meta, .am-connection, .am-legend, .am-legend-item { display: flex; align-items: center; }\n.am-page-header { justify-content: space-between; flex-wrap: wrap; gap: .75rem; }\n.am-page-title { margin: 0; font-size: 1.5rem; font-weight: 650; letter-spacing: -.025em; }\n.am-caption { margin: .25rem 0 0; font-size: .84rem; line-height: 1.5; }\n.am-section-header .am-caption { color: var(--color-secondary-foreground, var(--secondary-foreground, #c9d7e2)); }\n.am-muted { color: var(--am-muted); }\n.am-connection { gap: .5rem; flex-wrap: wrap; font-size: .75rem; }\n.am-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; }\n.am-stat { min-width: 0; padding: 1rem; border: 1px solid var(--am-border); border-radius: var(--radius, .75rem); background: var(--am-card); }\n.am-stat-label { gap: .5rem; color: var(--am-muted); font-size: .75rem; line-height: 1.4; min-height: 2.1rem; }\n.am-stat-label > span { flex-shrink: 0; }\n.am-stat-bottom { justify-content: space-between; gap: .75rem; margin-top: .5rem; }\n.am-stat-number { color: var(--am-text); font-size: clamp(2rem, 3.2vw, 2.55rem); font-weight: 750; font-variant-numeric: tabular-nums; line-height: 1.1; letter-spacing: -.02em; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35); }\n.am-spark { flex: 1; min-width: 24px; max-width: 100px; height: 34px; overflow: visible; }\n.am-section { min-width: 0; overflow: hidden; }\n.am-section-header { padding: 1rem 1.25rem .75rem !important; }\n.am-heading-line { gap: .65rem; }\n.am-section-title { font-size: .95rem !important; font-weight: 600; }\n.am-section-content { padding: 0 1.25rem 1rem !important; }\n.am-chip { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .75rem !important; font-weight: 600; line-height: 1.5; flex-shrink: 0; }\n.am-dot { width: 7px; height: 7px; flex-shrink: 0; display: inline-block; border-radius: 50%; background: currentColor; }\n.am-row { gap: .75rem; padding: .85rem 0; border-bottom: 1px solid var(--am-border); font-size: .82rem; min-width: 0; }\n.am-row:last-child { border-bottom: 0; }\n.am-row-main { flex: 1; min-width: 0; }\n.am-row-title { font-weight: 550; }\n.am-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.am-meta { gap: .6rem; flex-wrap: wrap; color: var(--am-muted); font-size: .76rem; margin-top: .25rem; min-width: 0; }\n.am-platform { white-space: nowrap; }\n.am-row-side { display: flex; align-items: flex-end; flex-direction: column; gap: .35rem; max-width: 35%; }\n.am-elapsed { font-variant-numeric: tabular-nums; white-space: nowrap; font-size: .82rem; font-weight: 550; color: var(--am-muted); }\n.am-task-index { min-width: 1.5rem; font-variant-numeric: tabular-nums; font-size: .7rem; font-weight: 550; }\n.am-task-tree { border-left: 1px solid var(--am-border); margin: 0 0 .5rem .2rem; padding-left: .85rem; }\n.am-task { gap: .5rem; font-size: .8rem; }\n.am-delegation { border: 1px solid var(--am-border); border-radius: calc(var(--radius, .75rem) * .7); padding: 0 .85rem; margin-top: .65rem; }\n.am-delegation-header { border-bottom: 0; }\n.am-delivery { margin: 0 0 .5rem 1.15rem; }\n.am-task-block { min-width: 0; }\n.am-log-btn { background: transparent; border: 1px solid var(--am-border); color: var(--am-muted); border-radius: .4rem; padding: .1rem .5rem; font-size: .68rem; font-weight: 600; cursor: pointer; line-height: 1.4; }\n.am-log-btn:hover { color: var(--am-text); border-color: var(--color-primary, var(--primary, currentColor)); }\n.am-log { margin: .15rem 0 .6rem; padding: .6rem .75rem; background: var(--color-muted, var(--muted)); border: 1px solid var(--am-border); border-radius: .5rem; font-family: var(--font-mono, ui-monospace, monospace); font-size: .7rem; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 260px; overflow-y: auto; }\n.am-command { font-family: var(--font-mono, ui-monospace, monospace); font-size: .75rem; }\n.am-empty { display: flex; justify-content: center; align-items: center; gap: .65rem; color: var(--am-muted); padding: 1.75rem .5rem; font-size: .8rem; }\n.am-recent { margin-top: .8rem; }\n.am-recent summary { cursor: pointer; padding: .5rem 0; color: var(--am-muted); font-size: .75rem; }\n.am-legend { gap: .6rem 1.25rem; flex-wrap: wrap; padding: .25rem 0 1rem; }\n.am-legend-item { gap: .4rem; color: var(--am-muted); font-size: .78rem; font-weight: 550; }\n.am-chart-wrap { position: relative; padding: 16px 0 0 1.5rem; }\n.am-chart { display: block; width: 100%; height: 160px; overflow: visible; }\n.am-chart-max { position: absolute; top: 0; left: 0; font-size: .72rem; font-weight: 600; line-height: 1; font-variant-numeric: tabular-nums; }\n.am-chart-axis { display: flex; justify-content: space-between; padding: .5rem 0 0 1.5rem; font-size: .72rem; font-weight: 550; }\n.am-error { padding: .85rem 1rem; color: var(--color-warning, var(--warning)); background: var(--am-card); border: 1px solid currentColor; border-radius: var(--radius, .75rem); font-size: .8rem; overflow-wrap: anywhere; }\n.am-skeleton { border-radius: var(--radius, .75rem); background: linear-gradient(100deg, var(--color-muted, var(--muted)) 25%, var(--color-secondary, var(--secondary)) 50%, var(--color-muted, var(--muted)) 75%); background-size: 220% 100%; animation: am-shimmer 1.8s linear infinite; }\n.am-skeleton-tile { height: 130px; }\n.am-skeleton-chart { height: 250px; }\n.am-pulse { animation: am-pulse 2.4s ease-in-out infinite; }\n.am-enter { animation: am-enter .32s ease-out; }\n.am-value-change { animation: am-value .35s ease-out; }\n@keyframes am-pulse { 50% { opacity: .4; } }\n@keyframes am-enter { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }\n@keyframes am-value { from { opacity: .5; } to { opacity: 1; } }\n@keyframes am-shimmer { from { background-position: 200% 0; } to { background-position: -20% 0; } }\n@media (min-width: 640px) { .am-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); } }\n@media (max-width: 420px) {\n  .am-stat { padding: .75rem; }\n  .am-stat-label { font-size: .7rem; gap: .35rem; }\n  .am-section-header { padding: .85rem .75rem .65rem !important; }\n  .am-section-content { padding: 0 .75rem .85rem !important; }\n  .am-row { gap: .5rem; }\n}\n@media (prefers-reduced-motion: reduce) {\n  .am-root *, .am-root *::before, .am-root *::after { animation: none !important; transition: none !important; }\n}";

  // Styles ship inside the JS payload: a separate style.css request can fail
  // or serve stale on its own, which left the layout broken (sparklines
  // defaulted to 300px and ran through the stat numbers).
  (function injectStyles() {
    var id = "agents-monitor-styles";
    if (document.getElementById(id)) return;
    var el = document.createElement("style");
    el.id = id;
    el.textContent = AGENTS_MONITOR_CSS;
    document.head.appendChild(el);
  })();
  var POLL_MS = 3000;
  var WINDOW_MS = 12 * 60 * 1000;
  var SERIES = [
    { key: "turns", label: "Active turns", icon: "pulse", tone: "success", dash: null },
    { key: "live_delegations", label: "Delegations", icon: "branch", tone: "primary", dash: "8 3" },
    { key: "subagents", label: "Subagents", icon: "agents", tone: "warning", dash: "3 3" },
    { key: "processes", label: "Background processes", icon: "terminal", tone: "secondary-foreground", dash: "10 3 2 3" }
  ];

  function number(value) { return typeof value === "number" && isFinite(value) ? Math.max(0, value) : 0; }
  function color(tone) { return "var(--color-" + tone + ", var(--" + tone + "))"; }
  function formatElapsed(value) {
    var seconds = Math.floor(number(value));
    if (seconds < 60) return seconds + "s";
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + "m " + String(seconds % 60).padStart(2, "0") + "s";
    return Math.floor(minutes / 60) + "h " + String(minutes % 60).padStart(2, "0") + "m";
  }
  function running(status) { return status === "running" || status === "finalizing"; }
  function toneFor(status) {
    if (status === "failed" || status === "timeout" || status === "error") return "destructive";
    if (status === "finalizing" || status === "pending" || status === "unknown") return "warning";
    return running(status) || status === "completed" ? "success" : "muted-foreground";
  }
  function Icon(props) {
    var paths = {
      pulse: "M2 12h4l3-8 5 16 3-8h5",
      branch: "M6 3v12a4 4 0 0 0 4 4h8M6 7h8a4 4 0 0 0 4-4M3 3h6M15 3h6M15 19h6",
      agents: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
      terminal: "M4 7l5 5-5 5M12 17h8"
    };
    return h("svg", { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true },
      h("path", { d: paths[props.name] || paths.pulse }));
  }
  function StatusDot(props) {
    return h("span", { className: "am-dot" + (running(props.status) ? " am-pulse" : ""), style: { color: color(toneFor(props.status)) }, "aria-hidden": true });
  }
  function Chip(props) {
    return h(C.Badge, { variant: "outline", className: "am-chip", style: props.tone ? { color: color(props.tone) } : undefined, title: props.title || String(props.children || "") }, props.children);
  }
  function PlatformHint(props) {
    var platform = props.platform || "local";
    var symbol = { discord: "#", telegram: "↗", slack: "#", cli: ">_", web: "◎" }[platform] || "◎";
    return h("span", { className: "am-platform", title: "Platform: " + platform },
      h("span", { "aria-hidden": true }, symbol), " ", platform);
  }
  function Elapsed(props) {
    var start = props.start;
    var end = props.end;
    var seconds = typeof start === "number" && start > 0 && (props.live || typeof end === "number")
      ? (typeof end === "number" ? end : props.now / 1000) - start
      : props.fallback;
    return h("span", { className: "am-elapsed", title: props.label || "Elapsed time" },
      typeof seconds === "number" && isFinite(seconds) ? formatElapsed(seconds) : "—");
  }
  function EmptyState(props) {
    return h("div", { className: "am-empty" }, h(Icon, { name: props.icon || "pulse" }), h("span", null, props.children));
  }
  function SectionCard(props) {
    return h(C.Card, { className: "am-section" },
      h(C.CardHeader, { className: "am-section-header" },
        h("div", { className: "am-heading-line" }, h(C.CardTitle, { className: "am-section-title" }, props.title),
          props.count !== undefined ? h(Chip, null, props.count) : null),
        props.description ? h("p", { className: "am-muted am-caption" }, props.description) : null),
      h(C.CardContent, { className: "am-section-content" }, props.children));
  }
  // Headroom: map values against 1.25x the window max so a peak line sits at
  // ~80% of the plot height instead of on the top gridline — and the label
  // lives in its own band above the SVG (see .am-chart-wrap padding-top), so
  // line and label can never collide regardless of font metrics/DPI.
  function linePoints(samples, key, x0, x1, top, bottom, maximum, start, end) {
    var scale = maximum * 1.25;
    return samples.map(function (sample) {
      var x = x0 + ((sample.t - start) / Math.max(1, end - start)) * (x1 - x0);
      var y = bottom - (number(sample[key]) / scale) * (bottom - top);
      return x.toFixed(2) + "," + y.toFixed(2);
    }).join(" ");
  }
  // Chart geometry: top margin keeps a max-value line clear of the top-left
  // scale label; x insets keep the endpoint dots from clipping at the edges.
  var CHART = { x0: 4, x1: 792, top: 26, bottom: 157 };
  var SPARK = { x0: 4, x1: 112, top: 7, bottom: 30 };
  function Sparkline(props) {
    var samples = props.samples.slice(-60);
    if (!samples.length) return null;
    var maximum = Math.max(1, ...samples.map(function (s) { return number(s[props.series.key]); }));
    var end = samples[samples.length - 1].t;
    var points = linePoints(samples, props.series.key, SPARK.x0, SPARK.x1, SPARK.top, SPARK.bottom, maximum, end - 59 * POLL_MS, end);
    return h("svg", { className: "am-spark", width: 100, height: 34, viewBox: "0 0 120 34", preserveAspectRatio: "none", "aria-hidden": true },
      h("polyline", { points: points, fill: "none", stroke: color(props.series.tone), strokeWidth: 1.8, vectorEffect: "non-scaling-stroke" }),
      h("circle", { cx: SPARK.x1, cy: points.split(" ").pop().split(",")[1], r: 2.2, fill: color(props.series.tone) }));
  }
  function StatTile(props) {
    return h("div", { className: "am-stat" },
      h("div", { className: "am-stat-label" }, h("span", { style: { color: color(props.series.tone) } }, h(Icon, { name: props.series.icon })), props.series.label),
      h("div", { className: "am-stat-bottom" },
        h("span", { key: props.value, className: "am-stat-number am-value-change" }, props.value),
        h(Sparkline, { series: props.series, samples: props.samples })));
  }
  function ActivityChart(props) {
    var samples = props.samples;
    var end = samples.length ? samples[samples.length - 1].t : props.now;
    var start = end - WINDOW_MS;
    var maximum = Math.max(1, ...samples.map(function (sample) {
      return Math.max(...SERIES.map(function (series) { return number(sample[series.key]); }));
    }));
    var children = [h("title", { key: "title" }, "Activity counts over the last 12 minutes"),
      h("desc", { key: "desc" }, "Counts are sampled every 3 seconds server-side and kept for 15 minutes, so the timeline survives page refreshes. Solid: turns; dashed: delegations; dotted: subagents; dash-dot: processes.")];
    [0, 0.5, 1].forEach(function (fraction) {
      var y = CHART.bottom - fraction * (CHART.bottom - CHART.top);
      children.push(h("line", { key: "grid" + fraction, x1: CHART.x0, x2: CHART.x1, y1: y, y2: y, stroke: color("border"), strokeDasharray: "3 5" }));
    });
    SERIES.forEach(function (series) {
      var points = linePoints(samples, series.key, CHART.x0, CHART.x1, CHART.top, CHART.bottom, maximum, start, end);
      if (!points) return;
      var firstX = points.split(",")[0];
      children.push(h("polygon", { key: series.key + "area", points: firstX + "," + CHART.bottom + " " + points + " " + CHART.x1 + "," + CHART.bottom, fill: color(series.tone), opacity: 0.04 }));
      children.push(h("polyline", { key: series.key, points: points, fill: "none", stroke: color(series.tone), strokeWidth: 2, strokeDasharray: series.dash, vectorEffect: "non-scaling-stroke", strokeLinejoin: "round" }));
      children.push(h("circle", { key: series.key + "point", cx: CHART.x1, cy: CHART.bottom - number(samples[samples.length - 1][series.key]) / (maximum * 1.25) * (CHART.bottom - CHART.top), r: 2.5, fill: color(series.tone) }));
    });
    return h(SectionCard, { title: "Activity (last 12 min)", description: "3-second samples · history persists across refreshes (15-minute server-side buffer)" },
      h("div", { className: "am-legend" }, SERIES.map(function (series) {
        return h("span", { key: series.key, className: "am-legend-item" },
          h("svg", { width: 24, height: 8, "aria-hidden": true }, h("line", { x1: 0, x2: 24, y1: 4, y2: 4, stroke: color(series.tone), strokeWidth: 2, strokeDasharray: series.dash })), series.label);
      })),
      h("div", { className: "am-chart-wrap" },
        h("span", { className: "am-chart-max am-muted" }, maximum),
        h("svg", { className: "am-chart", width: "100%", height: 160, viewBox: "0 0 800 160", preserveAspectRatio: "none", role: "img", "aria-label": "Activity over 12 minutes, peak value " + maximum }, children)),
      h("div", { className: "am-chart-axis am-muted" }, h("span", null, "12 min ago"), h("span", null, "6 min ago"), h("span", null, "Now")));
  }
  function TurnRow(props) {
    var turn = props.turn;
    var name = turn.display_name || turn.session_key || "Session";
    return h("div", { className: "am-row" + (props.fresh ? " am-enter" : "") },
      h(StatusDot, { status: turn.in_turn ? "running" : "recent" }),
      h("div", { className: "am-row-main" }, h("div", { className: "am-truncate am-row-title", title: name }, name),
        h("div", { className: "am-meta" }, h(PlatformHint, { platform: turn.platform }), turn.chat_type ? h("span", null, turn.chat_type) : null)),
      h("div", { className: "am-row-side" }, h(Chip, { tone: turn.in_turn ? "success" : undefined }, turn.in_turn ? "in turn" : "recent"),
        h(Elapsed, { start: turn.in_turn ? turn.turn_started_at : turn.last_active_at, live: true, now: props.now, fallback: turn.elapsed_s, label: turn.in_turn ? "Turn duration" : "Time since last activity" })));
  }
  function TaskRow(props) {
    var task = props.task;
    var goal = task.goal || "No goal provided";
    var openState = hooks.useState(false), open = openState[0], setOpen = openState[1];
    var logState = hooks.useState(null), log = logState[0], setLog = logState[1];
    function toggle() {
      var next = !open;
      setOpen(next);
      if (next && log === null && props.delegationId) {
        SDK.fetchJSON("/api/plugins/agents-monitor/transcript?delegation=" + encodeURIComponent(props.delegationId) + "&task=" + number(task.index) + "&lines=40")
          .then(function (result) { setLog(result); })
          .catch(function (err) { setLog({ ok: false, error: String(err && err.message || err) }); });
      }
    }
    return h("div", { className: "am-task-block" + (props.fresh ? " am-enter" : "") },
      h("div", { className: "am-row am-task" },
        h("span", { className: "am-task-index am-muted" }, "#" + (number(task.index) + 1)),
        h(StatusDot, { status: task.status }),
        h("div", { className: "am-row-main" }, h("div", { className: "am-truncate", title: goal }, goal),
          h("div", { className: "am-meta" }, h("span", { style: { color: color(toneFor(task.status)) } }, task.status || "unknown"), task.model ? h(Chip, null, task.model) : null)),
        h("div", { className: "am-row-side" },
          h(Elapsed, { start: task.started_at, end: task.completed_at, fallback: task.elapsed_s, live: running(task.status), now: props.now, snapshot: props.snapshot, label: task.timing_scope === "delegation" ? "Elapsed since delegation dispatch (task start unavailable)" : "Task elapsed time" }),
          props.delegationId ? h("button", { type: "button", className: "am-log-btn", onClick: toggle, "aria-expanded": open }, open ? "hide log" : "log") : null)),
      open ? (log === null
        ? h("div", { className: "am-log am-muted" }, "Loading transcript…")
        : log.ok
          ? h("pre", { className: "am-log" }, log.lines && log.lines.length ? log.lines.join("\n") : "(transcript empty)")
          : h("div", { className: "am-log am-muted" }, log.error || "Transcript unavailable")) : null);
  }
  function DelegationTree(props) {
    var unit = props.unit;
    var name = unit.parent_name || unit.parent_route || unit.delegation_id;
    var idleMinutes = unit.live && unit.last_activity
      ? Math.max(0, Math.floor((props.now / 1000 - unit.last_activity) / 60)) : null;
    return h("article", { className: "am-delegation" + (props.fresh ? " am-enter" : "") },
      h("div", { className: "am-row am-delegation-header" },
        h(StatusDot, { status: unit.state }),
        h("div", { className: "am-row-main" }, h("div", { className: "am-truncate am-row-title", title: name }, name),
          h("div", { className: "am-meta" }, h(PlatformHint, { platform: unit.parent_platform }), h("span", { title: unit.delegation_id }, "Level " + (number(unit.depth) + 1)), h("span", null, unit.task_count + (unit.task_count === 1 ? " task" : " tasks")))),
        h("div", { className: "am-row-side" }, h(Chip, { tone: toneFor(unit.state) }, unit.state || "unknown"),
          idleMinutes !== null && idleMinutes >= 30
            ? h(Chip, { tone: "warning", title: "No manifest activity for " + idleMinutes + " minutes" }, "idle " + idleMinutes + "m")
            : null,
          h(Elapsed, { start: unit.dispatched_at, end: unit.completed_at, live: unit.live, now: props.now, snapshot: props.snapshot, fallback: unit.elapsed_s }))),
      unit.delivery_state ? h("div", { className: "am-delivery" }, h(Chip, null, "Delivery: " + unit.delivery_state)) : null,
      h("div", { className: "am-task-tree" }, (unit.tasks || []).map(function (task, index) {
        var id = unit.delegation_id + ":" + (task.index == null ? index : task.index);
        return h(TaskRow, { key: id, task: task, now: props.now, snapshot: props.snapshot, delegationId: unit.delegation_id, fresh: props.added.has("task:" + id) });
      })));
  }
  function ProcessRow(props) {
    var proc = props.process;
    var command = proc.command || "No command provided";
    return h("div", { className: "am-row" + (props.fresh ? " am-enter" : "") },
      h(StatusDot, { status: proc.status === "running" ? "running" : (proc.exit_code === 0 ? "completed" : "failed") }),
      h("div", { className: "am-row-main" }, h("div", { className: "am-truncate am-command", title: command }, command.split(/\r?\n/)[0] || "(blank first line)"),
        h("div", { className: "am-meta" }, h("span", { title: proc.process_id }, proc.process_id || "Process"),
          proc.rss_mb != null ? h("span", { title: "Resident memory from /proc" }, "RSS " + (proc.rss_mb >= 1024 ? (proc.rss_mb / 1024).toFixed(1) + " GB" : proc.rss_mb + " MB")) : null,
          proc.cpu_avg_pct != null ? h("span", { title: "Average CPU share since start" }, "CPU " + proc.cpu_avg_pct + "%") : null)),
      h("div", { className: "am-row-side" }, h(Chip, { tone: proc.status === "running" ? "success" : undefined }, proc.status === "running" ? "running" : "exit " + (proc.exit_code == null ? "?" : proc.exit_code)),
        h(Elapsed, { start: proc.started_at, end: proc.finished_at, live: proc.status === "running", now: props.now, snapshot: props.snapshot, fallback: proc.elapsed_s })));
  }
  function LoadingSkeleton() {
    return h("div", { className: "am-root", role: "status", "aria-label": "Loading agents monitor" },
      h("div", { className: "am-stats grid grid-cols-2 sm:grid-cols-4 gap-3" }, SERIES.map(function (series) { return h("div", { key: series.key, className: "am-skeleton am-skeleton-tile" }); })),
      h("div", { className: "am-skeleton am-skeleton-chart" }));
  }
  function rowIds(data) {
    var ids = (data.active_turns || []).map(function (t) { return "turn:" + t.session_key; });
    (data.delegations || []).forEach(function (unit) {
      ids.push("delegation:" + unit.delegation_id);
      (unit.tasks || []).forEach(function (task, index) { ids.push("task:" + unit.delegation_id + ":" + (task.index == null ? index : task.index)); });
    });
    return new Set(ids.concat((data.processes || []).map(function (p) { return "process:" + p.process_id; })));
  }
  function AgentsPage() {
    var state = hooks.useState(null), view = state[0], setView = state[1];
    var errorState = hooks.useState(null), error = errorState[0], setError = errorState[1];
    var clockState = hooks.useState(Date.now()), now = clockState[0], setNow = clockState[1];
    var history = hooks.useRef([]);
    var previousIds = hooks.useRef(new Set());
    var seeded = hooks.useRef(false);
    hooks.useEffect(function () {
      var alive = true;
      var pending = false;
      function poll() {
        if (pending) return;
        pending = true;
        Promise.resolve().then(function () { return SDK.fetchJSON("/api/plugins/agents-monitor/overview"); }).then(function (data) {
          if (!alive) return;
          if (!data || !data.counts || !Array.isArray(data.active_turns) || !Array.isArray(data.delegations) || !Array.isArray(data.processes)) throw new Error("Invalid overview response");
          var t = Date.now();
          if (!seeded.current) {
            seeded.current = true;
            // Backend history stores epoch seconds; the chart runs in epoch
            // milliseconds. Normalise on seed or the window filter below
            // purges every loaded sample instantly (chart restarted on refresh).
            if (Array.isArray(data.history)) {
              history.current = data.history
                .filter(function (s) { return s && typeof s.t === "number"; })
                .map(function (s) {
                  var copy = {};
                  for (var key in s) copy[key] = s[key];
                  copy.t = s.t < 1e11 ? s.t * 1000 : s.t;
                  return copy;
                });
            }
          }
          var sample = { t: t };
          SERIES.forEach(function (series) { sample[series.key] = number(data.counts[series.key]); });
          history.current = history.current.filter(function (s) { return s.t > t - WINDOW_MS; }).concat([sample]).slice(-240);
          var ids = rowIds(data);
          var added = new Set(Array.from(ids).filter(function (id) { return !previousIds.current.has(id); }));
          previousIds.current = ids;
          setView({ data: data, receivedAt: t, added: added });
          setError(null);
        }).catch(function (err) {
          if (alive) setError(String(err && err.message || err));
        }).finally(function () { pending = false; });
      }
      poll();
      var pollTimer = setInterval(poll, POLL_MS);
      var clockTimer = setInterval(function () { if (alive) setNow(Date.now()); }, 1000);
      return function () { alive = false; clearInterval(pollTimer); clearInterval(clockTimer); };
    }, []);
    if (!view) return h("div", { className: "am-root" }, error ? h("div", { className: "am-error", role: "alert" }, "Agents monitor unavailable. Retrying every 3 seconds. ", error) : h(LoadingSkeleton));
    var data = view.data;
    var age = Math.max(0, Math.floor((now - view.receivedAt) / 1000));
    var stale = !!error || age > 10;
    var liveUnits = data.delegations.filter(function (unit) { return unit.live; });
    var doneUnits = data.delegations.filter(function (unit) { return !unit.live; });
    function delegation(unit) {
      return h(DelegationTree, { key: unit.delegation_id, unit: unit, now: now, snapshot: data.generated_at, added: view.added, fresh: view.added.has("delegation:" + unit.delegation_id) });
    }
    return h("div", { className: "am-root" },
      h("div", { className: "am-page-header" }, h("div", null, h("h1", { className: "am-page-title" }, "Agents"), h("p", { className: "am-muted am-caption" }, "Live turns, delegated work and background processes")),
        h("div", { className: "am-connection", role: "status" }, h(StatusDot, { status: stale ? "unknown" : "running" }), stale ? "Connection delayed" : "Live", h("span", { className: "am-muted" }, "updated " + age + "s ago"))),
      error ? h("div", { className: "am-error", role: "alert" }, "Refresh failed; showing last received data. Retrying every 3 seconds. ", error) : null,
      h("div", { className: "am-stats grid grid-cols-2 sm:grid-cols-4 gap-3" }, SERIES.map(function (series) { return h(StatTile, { key: series.key, series: series, value: number(data.counts[series.key]), samples: history.current }); })),
      h(ActivityChart, { samples: history.current, now: now }),
      h(SectionCard, { title: "Active turns", count: number(data.counts.turns), description: "Running turns and recently active sessions" },
        data.active_turns.length ? data.active_turns.map(function (turn) { return h(TurnRow, { key: turn.session_key, turn: turn, now: now, fresh: view.added.has("turn:" + turn.session_key) }); }) : h(EmptyState, null, "No active agent turns right now.")),
      h(SectionCard, { title: "Subagent delegations", count: liveUnits.length, description: "Parent sessions and their delegated tasks" },
        liveUnits.length ? liveUnits.map(delegation) : h(EmptyState, { icon: "branch" }, "No live subagents right now."),
        doneUnits.length ? h("details", { className: "am-recent" }, h("summary", null, "Recently finished · " + doneUnits.length), doneUnits.map(delegation)) : null),
      h(SectionCard, { title: "Background processes", count: number(data.counts.processes) },
        data.processes.length ? data.processes.map(function (proc) { return h(ProcessRow, { key: proc.process_id, process: proc, now: now, snapshot: data.generated_at, fresh: view.added.has("process:" + proc.process_id) }); }) : h(EmptyState, { icon: "terminal" }, "No background processes running.")));
  }
  window.__HERMES_PLUGINS__.register("agents-monitor", AgentsPage);
})();
