# Wallboard API Reference

The wallboard has no concept of history. Every field on a tile is simply
"whatever the caller last sent" — `POST /api/add` always overwrites the full
row. If you want a sparkline, a countdown, or a delta indicator, your own
system computes the numbers and resends them on every update; the wallboard
never tracks or accumulates anything server-side.

- **Base URL:** `http://<host>:3000` (default port `3000`, override with the `PORT` env var)
- **Auth:** none — anyone who can reach the port can read and write tiles
- **Content type:** `application/json` for all POST/PATCH bodies
- **CORS:** open (`cors()` with no restrictions)

## Response envelope

Success responses are JSON objects with `"success": true` plus the payload.
Errors are `{ "error": "...", ... }` with a `4xx`/`5xx` status code.

---

## Endpoints

### `GET /api/tiles`

Returns all active, non-expired tiles, sorted by status severity
(error → warning → info → success) then by `priority` ascending, then most
recently updated first.

```json
{
  "success": true,
  "count": 2,
  "tiles": [ { "...": "see Tile Object below" } ]
}
```

### `GET /api/tiles/:id`

Fetch a single active tile by its `tile_id`.

```json
{ "success": true, "tile": { "...": "..." } }
```

`404` if not found (or inactive).

### `POST /api/add`

Create a tile, or fully update it if `id` already exists (upsert — every
field is replaced, there is no partial patch here except the size-only
endpoint below). See [Fields](#fields) and [Tile Types](#tile-types).

```bash
curl -X POST http://localhost:3000/api/add \
  -H "Content-Type: application/json" \
  -d '{
    "id": "server_cpu",
    "title": "Server CPU Usage",
    "icon": "server",
    "value": "75%",
    "status": "warning",
    "status_text": "Monitor"
  }'
```

```json
{ "success": true, "message": "Tile created successfully", "tile_id": "server_cpu", "action": "created" }
```

`action` is `"created"` or `"updated"` depending on whether `id` already
existed. `400` if `id`, `title`, or `value` is missing, or if `size` isn't
one of the four valid values.

### `PATCH /api/tiles/:id/size`

Change only a tile's grid footprint, without resending every other field.
This is what the dashboard itself calls when you double-click a tile.

```bash
curl -X PATCH http://localhost:3000/api/tiles/server_cpu/size \
  -H "Content-Type: application/json" \
  -d '{"size":"2x1"}'
```

```json
{ "success": true, "message": "Tile resized successfully", "tile_id": "server_cpu", "size": "2x1" }
```

`400` for an invalid size, `404` if the tile doesn't exist.

### `DELETE /api/remove/:id`

Deactivates a tile (soft delete — sets `is_active = 0`, doesn't drop the row).

```bash
curl -X DELETE http://localhost:3000/api/remove/server_cpu
```

`404` if the tile doesn't exist.

### `POST /api/cleanup`

Manually deactivates any tile whose `expires_at` has passed. Normally you
don't need this — the server does the same sweep automatically every
5 minutes — but it's here if you want to force it (e.g. right after changing
a lot of `auto_expire` tiles).

```json
{ "success": true, "message": "Cleanup completed", "tiles_expired": 3 }
```

### `GET /api/health`

```json
{ "status": "ok", "database": "connected", "active_tiles": 24, "timestamp": "2026-07-31T09:12:00.000Z" }
```

### `GET /api/settings`

Returns dashboard-level settings (currently just `dashboard_title` and
`tile_lifetime_hours`, set during first-run setup at `/setup.html`).

```json
{ "success": true, "settings": { "dashboard_title": "ICT Operations Dashboard", "tile_lifetime_hours": "24" } }
```

---

## Fields

All fields below apply to `POST /api/add`. Everything except `id`, `title`,
and `value` is optional and falls back to the default shown.

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | string | **required** | Unique tile identifier (`tile_id` in the DB/response). Reusing an `id` updates that tile instead of creating a new one. |
| `title` | string | **required** | Tile heading. |
| `value` | string | **required** | Main display value (`"12"`, `"75%"`, `"Online"`). Still required even for tile types that don't visually show it (`countdown`, `ticker`, `traffic_light`) — pass any placeholder string. |
| `icon` | string | `"chart"` (📊) | An [icon key](#icons) (preferred) or a legacy emoji. Unrecognized values fall back to the generic chart icon. |
| `tile_type` | string | `"standard"` | See [Tile Types](#tile-types). |
| `sub_value` | string | `""` | Secondary line of text (varies by tile type — see below). |
| `status` | string | `"info"` | One of `error`, `warning`, `success`, `info`. Drives the tile's color across every theme and its sort order in `GET /api/tiles`. |
| `status_text` | string | `""` | Short status label shown in the footer (or under the dot, for `traffic_light`). |
| `additional_info` | string | `""` | Footer detail text, right-aligned. |
| `current_value` | integer | `0` | Numerator for `progress_wheel`/`progress_bar`/`gauge`; "current reading" for `delta`. |
| `max_value` | integer | `100` | Denominator for `progress_wheel`/`progress_bar`/`gauge`. |
| `previous_value` | number | `null` | Prior reading to compare `current_value` against — only used by `delta`. The caller computes and sends both numbers each time; the wallboard just diffs them at render time. |
| `sparkline_data` | number[] | `null` | Full array of recent values to plot — only used by `sparkline`. Resend the whole array on every update (not just the newest point). |
| `list_items` | string[] \| object[] | `null` | Rows for `list`, or the scrolling items for `ticker`. Each item is either a plain string, or `{ "label": "...", "value": "..." }` (rendered as a two-column row in `list`; `label: value` in `ticker`). |
| `target_date` | ISO datetime string | `null` | What to count down to — only used by `countdown`. E.g. `"2026-08-15T00:00:00Z"`. |
| `priority` | integer | `50` | Lower sorts first within the same status group (1–100 suggested range, not enforced). |
| `size` | string | `"1x1"` | Grid footprint: `1x1`, `2x1` (wide), `1x2` (tall), or `2x2` (large). |
| `auto_expire` | boolean | `true` | If true, the tile auto-deactivates 24h after creation/last update (fixed window, not configurable per-tile). |

---

## Tile Types

`tile_type` selects how a tile renders. Every type shares the same base
fields (`title`, `icon`, `status`, `status_text`, `additional_info`); the
column below lists which *extra* fields it actually reads.

| `tile_type` | Reads | Description |
|---|---|---|
| `standard` (default) | `value`, `sub_value` | Big number/text + subtitle. |
| `progress_wheel` | `current_value`, `max_value`, `sub_value` | Full circular progress ring with a `%` in the middle. |
| `progress_bar` | `value`, `sub_value`, `current_value`, `max_value` | Big value + linear progress bar underneath. |
| `gauge` | `current_value`, `max_value`, `sub_value` | Semicircle speedometer arc. Same data shape as `progress_wheel`, different shape — good for things with a "red zone" (latency, temperature). |
| `sparkline` | `value`, `sub_value`, `sparkline_data` | Big value + a small trend line plotted from `sparkline_data`. |
| `list` | `list_items` | Up to 6 rows. Plain strings, or `{label, value}` for a two-column layout (e.g. ticket ID + priority). |
| `countdown` | `target_date`, `sub_value` | Big "Nd Nh" / "Nh Nm" / "Nm" countdown to `target_date`, computed client-side on every refresh. Shows "Expired" once passed. |
| `delta` | `value`, `current_value`, `previous_value`, `sub_value` | Big value + a `▲/▼ N%` badge computed from `current_value` vs `previous_value`. |
| `traffic_light` | `status_text`, `sub_value`, `additional_info` | Minimal: icon, title, a big status-colored dot, and a status label. No numbers. Good for an at-a-glance grid of service statuses. |
| `ticker` | `list_items` (falls back to `value`) | Horizontally scrolling marquee strip, items joined with " • ". Best on a `2x1`+ tile. |

### Examples

**Gauge**
```json
{ "id": "api_latency", "title": "API Latency", "value": "142ms", "icon": "activity",
  "tile_type": "gauge", "status": "warning", "status_text": "Elevated",
  "current_value": 142, "max_value": 200, "sub_value": "p95, last 5 min" }
```

**Sparkline**
```json
{ "id": "req_per_min", "title": "Requests / min", "value": "1,842", "icon": "chart",
  "tile_type": "sparkline", "status": "info", "status_text": "Normal",
  "sparkline_data": [1200, 1350, 1280, 1500, 1620, 1700, 1842] }
```

**List**
```json
{ "id": "top_tickets", "title": "Top Open Tickets", "value": "5", "icon": "ticket",
  "tile_type": "list", "status": "warning", "status_text": "Review", "size": "1x2",
  "list_items": [
    { "label": "#4821 Login failures spiking", "value": "P1" },
    { "label": "#4818 VPN drops on WiFi", "value": "P2" }
  ] }
```

**Countdown**
```json
{ "id": "cert_expiry", "title": "SSL Cert Expiry", "value": "counting down", "icon": "lock",
  "tile_type": "countdown", "status": "warning", "status_text": "Renew soon",
  "target_date": "2026-08-15T00:00:00Z", "sub_value": "wildcard.example.com" }
```

**Delta**
```json
{ "id": "weekly_revenue", "title": "Weekly Revenue", "value": "$18.4k", "icon": "dollar-sign",
  "tile_type": "delta", "status": "success", "status_text": "Ahead of plan",
  "current_value": 18400, "previous_value": 16100, "sub_value": "vs last week" }
```

**Traffic light**
```json
{ "id": "payments_api", "title": "Payments API", "value": "up", "icon": "server",
  "tile_type": "traffic_light", "status": "success", "status_text": "Operational",
  "sub_value": "eu-west-1", "additional_info": "99.99% uptime" }
```

**Ticker**
```json
{ "id": "announcements", "title": "Announcements", "value": "live feed", "icon": "bell",
  "tile_type": "ticker", "status": "info", "status_text": "Live", "size": "2x1",
  "list_items": ["Scheduled maintenance Sat 2am-4am AEST", "New release v2.4 deployed"] }
```

---

## Status values

`status` drives both the tile's color (in every theme) and its sort order in
`GET /api/tiles`:

| Status | Sort priority |
|---|---|
| `error` | 1 (shown first) |
| `warning` | 2 |
| `info` | 3 |
| `success` | 4 |

## Size values

`1x1` (default), `2x1` (double-wide), `1x2` (double-tall), `2x2` (large).
Tiles flow around each other in a dense CSS grid, so mixing sizes is fine.

## Icons

Prefer sending one of these keys directly — they render as clean monochrome
line icons that automatically match the active theme and the tile's status
color:

`chart`, `ticket`, `rocket`, `disk`, `activity`, `database`, `server`,
`alert-circle`, `git-branch`, `flask`, `clock`, `smile`, `alert-triangle`,
`lock`, `shield`, `bug`, `dollar-sign`, `user-plus`, `users`, `wifi`,
`globe`, `bell`, `check-circle`

A small set of legacy emoji (📊🎫🚀💾🏃🗄️🖥️🔴🔀🧪⏱️😊🚨🔒🛡️🐛💰🆕👥📶🌐📟✅)
are also mapped to the equivalent icon key for backwards compatibility.
Anything else falls back to the `chart` icon. **Avoid passing raw emoji
through `curl` from a Windows shell** — it's easy for the terminal's
encoding to mangle multi-byte characters into `?` before they ever reach
the server; icon keys are plain ASCII and don't have this problem.

## Auto-expiry

Every tile created with `auto_expire: true` (the default) is deactivated
24 hours after its `created_at`/last `updated_at`, whichever is more recent
— re-adding the same `id` resets the clock. A background sweep runs every
5 minutes; `POST /api/cleanup` runs it on demand. Set `auto_expire: false`
for tiles that should persist until explicitly removed via
`DELETE /api/remove/:id`.
