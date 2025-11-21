# Frontend UI Revamp Plan (Shadcn + Tailwind)

Goal: replace the unstyled/broken UI with an opinionated, accessible design using Shadcn (Radix + Tailwind) and add UI/UX-focused tests that fail on console errors, broken buttons, or empty screens.

## Stack choice
- Use Shadcn UI (Tailwind + Radix) for component source ownership and brandable styling.
- Add helpers: `tailwind-merge` + `clsx` for class composition, `lucide-react` for icons, `@headlessui-float` (optional) for better popovers/tooltips, and `@playwright/test` (already present) for UI e2e with console-error detection and screenshots/traces on failure.

## Step-by-step plan
1) **Tooling bootstrap**
   - Add Tailwind config (with CSS variables + theme tokens), PostCSS, base styles, and Shadcn CLI config; generate base primitives (Button, Input, Card, Badge, Tabs, Table, Alert, Skeleton, Tooltip, Toast).
   - Add utility helpers (`cn` wrapper using clsx/tw-merge).
   - Ensure ESLint/Prettier cover the new directories.

2) **App shell & typography**
   - Replace inline styles with a layout shell (sidebar/nav + header + content), set global typography (display+mono), color palette, spacing, and container widths.
   - Add loading/empty/error patterns (skeletons + alerts) as reusable components.

3) **Flows page rewrite**
   - Render flows list as cards/table with actions, status chips, and error/empty states.
   - Detail panel uses Cards + Tabs; add proper loading skeletons and inline error toasts.
   - “Run” and “Run with trace” buttons show progress state and surface API errors inline.

4) **Traces page rewrite**
   - Table/list of trace runs with sort by start time, badges for exit status, and tooltips for commands.
   - Integrate trace detail preview drawer: clicking a row navigates + shows recent trace metadata without full page reload.

5) **Run detail page rewrite**
   - Split layout: left summary (flow name, timing, status chips), right details (trace records accordion, artifacts list with download links).
   - Syntax-highlighted JSON blocks, compact artifact list with size badges, and empty-state guidance.
   - Graceful handling of 404s and API failures (alert + retry).

6) **Global interactions**
   - Toasts for API failures, top-level error boundary for React render issues, and loading overlay on long requests.
   - Keyboard focus states and aria labels on all controls.

7) **Testing**
   - Playwright: add suites that 1) block on console errors, 2) click every nav/tab/button, 3) run a flow with and without trace, 4) assert tables render rows, 5) verify trace detail shows records or empty-state text (not raw errors), 6) capture screenshot/snapshot on failure.
   - Consider a visual regression baseline for key pages (optional if time).

8) **Logging/observability**
   - Keep frontend dev/build logs in `logs/frontend-dev.log` (already captured).
   - Add Playwright test artifacts (trace/report) to log sources for debugging failures.
   - If needed, add a lightweight client-side logger to emit errors to a file-backed endpoint (future work).

9) **Docs**
   - Update README with new UI screenshots and dev commands.
   - Note Shadcn/Tailwind conventions and how to add new components.
   - Add a short “UI testing” section describing the Playwright checks and how to view reports.

## Ready-to-implement tasks
- Wire Tailwind/Shadcn config + base components, rebuild pages, and ship the Playwright UX coverage.
- Update log sources to include Playwright artifacts for debugging.
