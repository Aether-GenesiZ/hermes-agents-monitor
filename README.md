# Hermes Agents Monitor

A drop-in dashboard plugin for [Hermes Agent](https://github.com/NousResearch/hermes-agent) that shows, in real time, what your agents are actually doing: active turns, subagent delegation trees (with depth levels), and background processes — plus live elapsed timers, an activity graph, and transcript tails.

Built as a pure dashboard plugin: no core modifications, survives `hermes update`, and the backend reads only durable, read-only state (never the gateway process itself), so monitoring adds effectively zero load to the gateway.

## What you get

- **Active turns** — every session currently mid-turn (live dot) or active in the last 2 minutes, with platform, chat type and a ticking turn timer
- **Subagent delegations** — parent chat → delegation cards with depth level (L1, L2, …), per-task goals, status, model, elapsed/frozen durations, delivery state, and an *idle* badge when a live delegation's manifest has been quiet for 30+ minutes
- **Transcript tails** — click `log` on any task to read the last lines of the live subagent transcript, without leaving the dashboard
- **Background processes** — command, process id, elapsed, exit code, and (on Linux) RSS + average CPU from `/proc`
- **Stats row** — four responsive stat tiles with per-tile sparklines
- **Activity graph** — 12-minute multi-series chart (3-second samples) with server-side history, so the graph is populated the moment you open the page instead of starting blank
- **Polish** — 3s polling with stale-connection indicator, last-data-on-error resilience, loading skeletons, subtle animations that respect `prefers-reduced-motion`, full theme awareness via the dashboard's CSS variable system, and accessible markup (roles, labels, tooltips)

## Requirements

- Hermes Agent **v0.22.3 or newer** (web dashboard with the plugin system and consent gate)
- No other dependencies

## Install

```bash
git clone https://github.com/Aether-GenesiZ/hermes-agents-monitor ~/.hermes/plugins/agents-monitor
```

User plugins are arbitrary code by design, so Hermes gates them behind an explicit allowlist. Add the plugin to `~/.hermes/config.yaml`:

```yaml
plugins:
  enabled:
    - agents-monitor
```

Then restart the dashboard so the plugin's backend routes mount:

```bash
systemctl --user restart hermes-dashboard   # or your equivalent
```

Open the dashboard — an **Agents** tab appears after *Status*.

### Optional: matching theme

A dark "ops console" theme that pairs with this plugin ships in [`theme/`](theme/):

```bash
mkdir -p ~/.hermes/dashboard-themes
cp ~/.hermes/plugins/agents-monitor/theme/serus-ops.yaml ~/.hermes/dashboard-themes/
```

Select **Serus Ops** in *Settings → Appearance*.

## How it works

The backend (`plugin_api.py`) assembles one aggregate `/overview` response (and a `/transcript` tail endpoint) from read-only sources:

- `state.db` opened with SQLite `mode=ro` (routing entries with active-turn markers, `async_delegations`, session ancestry for depth levels)
- `~/.hermes/processes.json` (background-process registry checkpoint)
- `~/.hermes/cache/delegation/live/<id>/manifest.json` (per-task status and timing)
- `~/.hermes/cache/delegation/live/<id>/task-<n>.log` (transcript tails, served through a strict path-guarded endpoint)

Timestamps are coerced from mixed epoch/ISO-8601 storage. All blocking I/O runs through `asyncio.to_thread` so the dashboard event loop is never held. Polling only happens while a browser tab is open.

**Privacy:** everything is local and read-only. The plugin collects no telemetry and makes no network calls beyond your own dashboard.

## Troubleshooting

- **Plugin not listed / API 404** — check that `agents-monitor` is in `plugins.enabled` in `~/.hermes/config.yaml`, then restart the dashboard.
- **Tab missing after edits to `plugin_api.py`** — backend routes mount at process startup only; restart the dashboard.
- **Frontend edits don't show** — static assets are served with `no-store`; a hard refresh is enough.
- **Faint or invisible text under a custom theme** — this plugin never styles text with the `--foreground` chain (a theme's palette `foreground` layer is a texture with alpha 0 by default). If you fork it, keep using `card-foreground` for text.

## License

MIT — see [LICENSE](LICENSE).
