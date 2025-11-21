# Caching & smooth refresh plan (tmux dashboard)

Goal: reduce flicker and keep panes usable even if a source command is slow/failing. Applies first to `alerts` (and optionally traces/git).

## Tests to add (fail first)
- `test_alerts_cache_fallback.sh`: run alerts once to generate output, then simulate a failing alerts command (e.g., RG missing or forced exit 1) and assert the pane/log shows the last cached output with a “(cached)” marker.
- `test_alerts_timely_render.sh`: assert alerts pane log has non-empty content within 10 seconds of session start (retry loop) to catch delayed/blank states.
- `test_trace_cache_fallback.sh` (optional): same pattern for traces if we add caching there.
- `test_git_views_cache_fallback.sh` (optional): ensure git panes show cached snapshot if git commands error out.

## Implementation steps
1) Add a cache helper:
   - New script `scripts/cache_wrapper.sh CMD...`:
     - Run `CMD`, write stdout to `logs/tmux/cache/<name>.out` if non-empty, stream to stdout.
     - On failure/empty, emit the cached file (if present) with a `(cached)` header and exit 0 (so pane stays alive).
     - Keep cache per pane (alerts, traces, git) keyed by a provided name.
2) Wire alerts through the cache wrapper:
   - Change `ALERTS_CMD` to `./scripts/cache_wrapper.sh alerts ./scripts/log_alerts.sh --top 12 --recent 8`.
   - Cache path: `logs/tmux/cache/alerts.out`.
   - Add a small “(cached at <ts>)” banner when emitting cached content.
3) Optional: wire traces/git views similarly if desired.
4) Smooth redraw:
   - Already using `dashboard_loop.sh` to cut flicker. Keep it, but ensure we don’t clear cached output on failure.
5) Pane titles are set inside scripts (already done); keep border format simple.

## Notes
- Keep cache files in `logs/tmux/cache/` and rotate/overwrite; no history needed.
- Preserve exit 0 on cache fallback to keep tmux panes alive.
- Keep a short retry loop in tests (≤10s) to detect late/blank renders.
