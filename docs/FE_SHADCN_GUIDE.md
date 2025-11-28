# Shadcn/Tailwind UI Quick Guide

This repo ships Shadcn + Tailwind (Radix under the hood) in `frontend/`. Use this as the day-to-day playbook; `docs/FE_SHADCN_CONTEXT.md` holds the longer brand inputs.

## Project layout
- Theme tokens: `frontend/src/index.css` (`:root` + `.dark` CSS vars, `@tailwind base/components/utilities`).
- Shadcn config: `frontend/components.json` (aliases `@/components`, `@/lib/utils`, CSS at `src/index.css`).
- Tailwind config: `frontend/tailwind.config.ts` (keeps Shadcn preset + project colors).
- Components live in `frontend/src/components/`; utility helpers in `frontend/src/lib/`.

## Adding components
```bash
cd frontend
npx shadcn-ui@latest add button input tooltip # add more as needed
```
- Generated files are **source**—edit freely (variants, spacing, tokens).
- Keep imports using the aliases above; avoid relative `../../` paths.
- Prefer tokens (`--primary`, `--radius`, `--accent`) over hard-coded colors.

## Styling conventions
- Typography: Space Grotesk (defined in `index.css`) as the sans family.
- Density: default radius `--radius: 0.75rem`; cards use neutral backgrounds; accent color is `--accent` (blue) for highlights.
- Utilities: use `cn` from `@/lib/utils` for conditional classes; avoid string concatenation.
- Dark mode: keep both `:root` and `.dark` vars in sync when adjusting the palette.

## Testing UI changes
- Unit: `npm run test` (Vitest).
- E2E: `npm run e2e` (Playwright); captures for key views live in `frontend/tests/e2e/peekaboo-*.spec.ts`.
- Keep snapshots/captures updated when changing layouts; add new Peekaboo captures for novel flows.

## Common tasks (recipes)
- **Add a new primitive (e.g., Badge)**: run Shadcn `add badge`, adjust tokens if new colors are needed, add a small story/test or usage in a page.
- **Tweak theme**: edit `index.css` vars, and if new tokens are added, expose them via Tailwind config.
- **New page layout**: compose existing primitives; favor `Card`, `Tabs`, `Table` patterns already in the codebase to stay consistent.

## References
- Shadcn docs: <https://ui.shadcn.com>
- Radix primitives: <https://www.radix-ui.com/primitives>
- Tailwind config docs: <https://tailwindcss.com/docs/configuration>
