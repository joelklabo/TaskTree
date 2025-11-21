# Tmux design + UX ideas

Source: curated suggestions (catppuccin/powerline styling, rounded segments, menus, mouse-friendly shortcuts).

## Visual goals
- Calm, consistent palette with contrast (Catppuccin mocha flavour as base).
- Rounded/pill status/window segments; bold active window, subdued inactive.
- Clickable/interactive status bits treated like UI buttons.
- Mouse-friendly (copy on click, menus).

## Theme/plugins to leverage
- `catppuccin/tmux` (rounded window status style, palette).
- `tmux-prefix-highlight`, `wfxr/tmux-power` (status segments/icons).
- `jaclu/tmux-menus` (prefix+Space popup menu for common actions).
- Optional: nerd fonts/powerline glyphs for separators.

## Status bar sketch
- Position: bottom; truecolor enabled.
- `status-left`: session name with pill separators (/), prefix indicator.
- `status-right`: clock + small system bits (CPU short) + attach hint.
- Window formats: inactive `#I:#W` muted; active pill with icon and bold.
- Pane borders: softer inactive, accent active.

## UI affordances
- Mouse: double-click pane to capture+toast; mouse on by default.
- Menu: prefix+Space opens tmux-menus popup (jump to window, run refresh, copy pane).
- Overlay/help: concise per-pane hints for copy/toast/attach.

## Next implementation checkpoints (TTD)
- Add failing tests for: themed tokens present; menu binding exists; mouse copy binding creates capture+toast.
- Then wire plugins, status formats, and bindings accordingly.

## Notes for rollout
- Ensure nerd font available so separators/icons render.
- Keep config modular in `.tmux.local.conf` with TPM-managed plugins.
- Reload shortcut: Prefix+R already present; keep help pane updated with new bindings.
