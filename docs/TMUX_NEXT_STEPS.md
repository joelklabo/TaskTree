# Tmux dashboard next steps (plan)

Goals: fix visibility/UX for URLs and commands, add overlays/help, tighten tests to catch regressions (incl. search pane bug). TTD enforced: write failing tests for every item, then implement.

## Work items (with pre-implementation failing tests)
- Frontend URL visibility
  - Test (fail first): status output contains http(s) links for backend/frontend with host+port (regex match). Add indicator text/color token. Prevent scroll drift by ensuring output fits/clears.
- Copy/buttons discoverability
  - Test (fail first): help/overlay text in dashboard/search panes includes capture shortcut (Prefix+C/Prefix+y) and toast test; search pane REPL intro mentions copy.
- Search pane regression
  - Test (fail first): reproduce your missing-output scenario (TBD once reproduced) as `scripts/tests/test_log_search_<bug>.sh` so it fails before fixing.
- VS Code / other agents discoverability
  - Test (fail first): status/help output includes session attach hint (`tmux attach -t <session>` + launcher).
  - Agent-facing name/entrypoint: use the standard “tmux dashboard” name everywhere (README/Makefile/marker file).
- Pane/title design & theming
  - Test (fail first): smoke/e2e asserts every pane has a non-empty title and “nice” style token (e.g., colorized prefix from theme) in status line/window list.
  - Plugins to leverage: catppuccin/tmux for themed titles, tmux-prefix-highlight, wfxr/tmux-power for status segments, tmux-better-mouse-mode (optional), tmux-themepack (fallback). Evaluate and pick at least catppuccin + powerline-compatible titles.
- Status pane anti-scroll/compactness
  - Test (fail first): status pane output fits within pane height without pushing the first lines offscreen (e.g., assert first header still present after render); enforce trimmed content (limit trace listing/log sizes shown).
- Log sources surfaced from YAML
  - Test (fail first): status/help pane lists configured log sources from `logs/log_sources.yaml` (not hardcoded), including absolute paths.
- Mouse/UX copy shortcut
  - Test (fail first): mouse interaction (double-click/mousedown binding) triggers a pane capture and emits a toast message in tmux logs.
- Design refresh (titles/borders/theme/menu)
  - Test (fail first): themed status/window formats include rounded/catppuccin tokens; pane titles populated; optional menu plugin present in bindings.

## Tests to add/expand (all must fail before implementation)
- Search pane regression: new targeted test reproducing the bug you saw.
- URL/link rendering: assert `http://` (or https) for frontend/backend appears in status text.
- Help/overlay visibility: assert dashboard/search pane logs contain capture/toast hints and attach instructions.
- Pane/title design: assert pane titles populated and themed token present in status/window line (via tmux e2e/smoke).
- Status anti-scroll/compactness: assert status header is still visible after rendering (no scroll past top), and content length stays under a capped line count.
- Log sources listing: assert status/help shows entries loaded from `logs/log_sources.yaml`.
- Mouse copy binding: assert binding exists (MouseDown/MouseDouble) and capture file count increases after invoking the bound command.
- Design/menu: assert status/window format contains catppuccin/power tokens and menu binding is registered.

## Tests to add/expand
- Search pane regression: reproduce the missing-output bug (directory-only sources were fixed; add your scenario as a dedicated test).
- URL/link rendering: lightweight check that status output includes `http://` with resolved host/port for frontend/backend.
- Help/overlay visibility: assert dashboard/help panes include the shortcut hints (copy, toast test, attach instructions).

## Execution order
1) Write failing tests for: search-pane bug, URL links, help/overlay hints, pane/title design, attach hints.
2) Once all above are red, implement fixes/features: link/banner + anti-scroll; overlays/help; attach hints; titles/theme; search fix.
3) Wire tests into `make test-scripts`; rerun full suite.

## Notes
- No changes to unrelated panes unless needed; keep help/overlays concise.
- Continue using TTD: failing test first, then minimal fix, then docs update.
