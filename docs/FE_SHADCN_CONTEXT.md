# Shadcn + Tailwind “Brand Input” Guide (Working Context)

This file captures the provided Shadcn+Tailwind guidance and evolving notes for the TaskTree frontend. If reality ever conflicts with these assumptions, update this file to keep it the single source of truth.

---

## Source Context (verbatim from user)

<shadcn context>
# Shadcn + Tailwind “Brand Input” Guide
## For handing to your friend who’s building the site

This is written assuming:

- React + TypeScript
- Next.js style app structure
- Tailwind CSS (v3 or v4+)
- shadcn/ui components (Radix-based, Tailwind-styled)  [oai_citation:0‡shadcn.io](https://www.shadcn.io/ui?utm_source=chatgpt.com)  
- Lucide icons (or equivalent)  [oai_citation:1‡Lucide](https://lucide.dev/guide/packages/lucide-react?utm_source=chatgpt.com)  

You can just fill this out / tweak it and send it back to them.

---

## 1. What shadcn/ui actually is (so you can think correctly)

**Mental model:**

- It’s _not_ a normal “install and theme” UI library.
- It’s a set of component _source files_ (Button, Card, Dialog, etc.) you copy into your repo.
- Each component:
  - Uses **Radix UI** primitives for a11y and behavior (focus, keyboard, ARIA).  [oai_citation:2‡shadcn.io](https://www.shadcn.io/ui?utm_source=chatgpt.com)  
  - Is styled with **Tailwind CSS** and shared **design tokens** (CSS variables) for colors, radius, etc.  [oai_citation:3‡Shadcn UI](https://ui.shadcn.com/docs/theming?utm_source=chatgpt.com)  
- You’re expected to:
  - Treat these components as the **starting point of your design system**.
  - Edit them freely (JSX, Tailwind classes, variants, etc.).
  - Keep a consistent theme via shared tokens rather than random utility classes.

So your “inputs” (brand, palette, typography, UX patterns) should all be expressed as:

- **Design tokens** (colors, radii, spacing, shadows, fonts).  [oai_citation:4‡Tailwind CSS](https://tailwindcss.com/docs/theme?utm_source=chatgpt.com)  
- **Component conventions** (button sizes, card padding, table density, etc.).
- **UX patterns** (drawers vs modals, toasts vs inline errors, etc.).

---

## 2. The concrete inputs your friend asked for

Here’s his list, expanded into actionable bullets with example answers.

### 2.1 Brand

**You should provide:**

- **Brand adjectives (3–6):**
  - e.g. _“confident, friendly, precise, playful, low-friction”_.
- **Visual vibe:**
  - Light vs dark default?
  - “Neon on dark” vs “paper on ink” vs “muted gray with one strong accent”?
- **Product positioning:**
  - B2B dashboard, consumer app, dev tool, marketing site?
- **Motion personality (if any):**
  - Snappy and minimal vs slow and “delightful” with easing.
- **Examples (optional but helpful):**
  - “I like the density of X”, “Buttons from Y but more rounded”, “Tables like Z but less noisy.”

Your friend will translate this into:

- Color choices for `--primary`, `--accent`, neutral stack.
- Radius, shadows, spacing defaults.
- When to use animation vs static states.

---

### 2.2 Palette / Typography

#### 2.2.1 Color palette

shadcn/ui uses CSS custom properties (variables) as the **color API**, typically something like:

- `--background`, `--foreground`
- `--muted`, `--muted-foreground`
- `--card`, `--card-foreground`
- `--border`, `--input`, `--ring`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`  [oai_citation:5‡Shadcn UI](https://ui.shadcn.com/docs/theming?utm_source=chatgpt.com)  

You should give:

1. **Primary brand color** (main action color)
   - Hexes for ~3–5 shades: `primary-50`, `primary-100`, `primary-500`, `primary-600`, `primary-700`.
   - Or: “Use Tailwind `blue` around 500–600 as primary but slightly desaturated.”  [oai_citation:6‡Shadcn UI](https://ui.shadcn.com/colors?utm_source=chatgpt.com)  

2. **Accent color**
   - Optional. Used for “fun” elements, tags, charts, highlights.
   - E.g. “Lime accent for charts and badges, but avoid in forms.”

3. **Semantic colors**
   - **Success**: green-ish, friendly, works on both light & dark backgrounds.
   - **Warning**: amber/yellow; visible on white and dark gray.
   - **Destructive**: red that still passes contrast when used as text or fill.  [oai_citation:7‡Medium](https://hexshift.medium.com/how-to-build-a-design-token-system-for-tailwind-that-scales-forever-84c4c0873e6d?utm_source=chatgpt.com)  

4. **Neutral palette / background strategy**
   Pick one of these:

   - **“Paper” style** (B2B admin / forms):
     - Background: off-white / light gray.
     - Cards: white, gentle shadows.
     - Borders: soft mid-gray.
   - **“Glass” style**:
     - Background: very dark or very light neutral.
     - Cards: subtle alpha/blur style; stronger contrast edges.
   - **“Terminal/devtool” style**:
     - Background: near black.
     - Text: off-white.
     - Primary: bright accent (blue, green, violet).

5. **Light / Dark behavior:**
   - Default theme: light or dark?
   - Should primary color **stay identical** across themes or shift slightly (lightness/chroma) for dark mode?

Your friend will map your palette to:

- `:root { --background: ...; --primary: ...; ... }`
- `.dark { --background: ...; --primary: ...; ... }` in `globals.css`, and then use Tailwind’s theme directives (or `@theme`) to expose them as utilities.  [oai_citation:8‡Shadcn UI](https://ui.shadcn.com/docs/theming?utm_source=chatgpt.com)  

> **Tip for you:** when unsure, “neutral gray surfaces + one saturated primary + one subtle accent” is usually enough.

---

#### 2.2.2 Typography

Tailwind exposes typography via `theme.fontFamily`, `fontSize`, `fontWeight`, etc.  [oai_citation:9‡Tailwind CSS](https://tailwindcss.com/docs/theme?utm_source=chatgpt.com)  

You should give:

1. **Font choices:**
   - **Brand display font** (optional):
     - Used in logo, hero headings, maybe section titles.
   - **Body font** (required):
     - Generally a safe, legible sans for apps (e.g. Inter, system UI stack).
   - **Code font** (optional but good for dev tools):
     - Used in code blocks, logs, etc.

2. **Hierarchy preferences:**
   - How bold/large should titles be relative to body?
     - e.g. “H1 2.25× body, H2 1.6×, H3 1.3×, strong tracking on headings.”
   - Should everything be slightly condensed, normal, or wide?

3. **Tone:**
   - Rounded & friendly vs sharp & “professional”.
   - E.g. “Body font should feel like GitHub/Linear, not playful.”

Your friend will:

- Set `fontFamily` in `tailwind.config.*`.
- Define a small type scale for components (Button, Input, Badge, etc.).
- Wire up global `body` text styles and heading patterns.

You can also specify:

- “All caps on navigation, but not on buttons.”
- “Buttons use semi-bold, not bold.”

---

### 2.3 Tailwind tokens / utilities

Instead of sprinkling arbitrary utility classes everywhere, think in terms of **design tokens** stored in Tailwind’s `theme` and CSS variables.  [oai_citation:10‡Tailwind CSS](https://tailwindcss.com/docs/theme?utm_source=chatgpt.com)  

Your friend will care about at least:

- **Colors** (covered above).
- **Spacing scale** (e.g. 4px base: 4, 8, 12, 16, 24, 32, 40, 48…).
- **Radius scale** (e.g. `sm = 4`, `md = 8`, `lg = 12`, `xl = 16`, `full`).
- **Shadow scale** (`xs`, `sm`, `md`, `lg`, `xl`).
- **Border widths** (`hairline`, `1px`, `2px`).
- **Animation durations/easings** (fast, normal, slow).

**What you should give:**

- Rough **preferences**, not necessarily exact numbers:
  - “Overall radius: medium, not pill but not sharp.”
  - “Tables should have minimal shadow, cards a bit more.”
  - “Don’t use huge shadows; prefer flat, subtle depth.”
- Spacing:
  - “Form fields: comfortable, not cramped.”
  - “Modal padding moderate (NOT edge-to-edge).”
- Motion:
  - “Animations should be subtle and quick; no bouncing.”

Your friend can then:

- Set `theme.spacing/radius/shadows` in Tailwind config.
- Use them for all shadcn component variants.
- Optionally use Tailwind v4 `@theme` block so tokens are available as CSS vars and utilities simultaneously.  [oai_citation:11‡Medium](https://medium.com/%40sureshdotariya/tailwind-css-4-theme-the-future-of-design-tokens-at-2025-guide-48305a26af06?utm_source=chatgpt.com)  

---

### 2.4 Icon set preference (Lucide vs others)

**Lucide** is the default “works everywhere” choice:

- Open-source, 1000+ line icons.  [oai_citation:12‡Lucide](https://lucide.dev/guide/?utm_source=chatgpt.com)  
- Clean, outline-style, fits dev tools and dashboards.
- React package exports each icon as a component (e.g. `<Settings />`) that renders inline SVG.  [oai_citation:13‡Lucide](https://lucide.dev/guide/packages/lucide-react?utm_source=chatgpt.com)  

If you’re okay with outline icons, just say:

- “Use Lucide, default stroke width is fine.”
- If you care:
  - “Icons should look more neutral than playful.”
  - “Don’t use icons for everything; only navigation, key actions, and status.”

If you want something else:

- **Guidance you can give:**
  - “Prefer solid icons over outline.”
  - “Prefer rounded corners.”
  - “Prefer thin strokes.”

Your friend will probably:

- Create a local `Icon` wrapper that:
  - Normalizes size (e.g. `size={16}` / `size={18}`).
  - Lets components ask for icons via props.
- Use icons sparingly in:
  - Buttons, nav, alerts, empty states, toasts.

---

### 2.5 UX patterns: drawers vs modals, tables, skeletons, toasts

This is where you can be really helpful.

#### 2.5.1 Drawers vs Modals

**Modals (Dialog):**

- Best for:
  - Short, focused decisions:
    - “Are you sure you want to delete?”
    - “Rename X”.
  - Auth flows, simple forms, 1–2 inputs.
- Behaviors:
  - Centered overlay, dimmed background.
  - Trap focus, ESC to close.

**Drawers / Sheets:**

- Best for:
  - Multi-step flows that relate to the existing screen.
  - “Edit details” side panels.
  - Filters, advanced options, settings.
- Behaviors:
  - Slide in from side/bottom.
  - Should feel dismissible but not fragile.

What to tell your friend:

- “Use modals only for confirmations and very small tasks.”
- “Use side drawers for editing an existing item while keeping the main list in view.”
- “Mobile: bottom sheet for quick actions; full-screen for heavier flows.“

#### 2.5.2 Table density

shadcn tables are usually built from base primitives, so your friend will apply Tailwind spacing and typography to define density.

Inputs from you:

- **Density levels you want:**
  - “Default: comfortable; row height ~44–48px.”
  - “Compact mode toggle: ~36–40px rows.”
- **Where compact mode is allowed:**
  - “Analytics tables can be compact; settings tables stay comfortable.”
- **Striping & borders:**
  - “Subtle row striping? Horizontal rules? Both? None?”
  - e.g. “Light row hover, thin horizontal separators, no vertical grid.”

Also:

- “Align numeric columns right; text left.”
- “Show max 2 lines of text; truncate beyond that.”

#### 2.5.3 Skeletons vs spinners vs shimmer

Skeletons:

- Good for:
  - Predictable layout (tables, cards, forms).
  - Loading states longer than ~300–500ms.
- Should:
  - Match rough shape of content.
  - Use muted colors, subtle shimmer at most.

Spinners:

- Good for:
  - Tiny, localized actions (button loading state).
  - Very short tasks (< 500ms), although sometimes just a disabled button is enough.

Inputs for your friend:

- “For page-level loads, use skeletons (e.g. skeleton rows for tables, skeleton cards).”
- “For destructive actions (delete), just disable the button and show spinner inline.”
- “Avoid global full-screen spinners except for rare ‘first load’ states.”

#### 2.5.4 Toasts

Toasts are baked into shadcn via a provider + hook pattern.

You should define:

- **When to toast:**
  - Success:
    - Saves, creates, deletes (when they actually succeed).
  - Error:
    - Non-field specific errors (network, server).
  - Info:
    - Background jobs (“Export started”).

- **Tone:**
  - Short, factual:
    - “Saved.”
    - “Changes discarded.”
    - “Could not reach server; try again.”

- **Duration:**
  - 3–5 seconds typical.
  - Longer or persistent for destructive operations.

Guidance:

- “Don’t toast for every click; only major results.”
- “Validation errors should show near the field; not only as toasts.“

#### 2.5.5 Extra patterns worth deciding

- **Command palette / Command menu:**
  - Do you want a `⌘K` style palette?
  - If yes:
    - “Show navigation items, search results, key actions.”
- **Breadcrumbs vs tabs vs sidebar:**
  - How do you want main navigation to feel?
- **Empty states:**
  - “Always show empty states with an icon, a one-line explanation, and a primary action.”
- **Error states:**
  - “Never show raw error codes; wrap them in friendly messages.”

---

## 3. What your friend probably needs on the implementation side

You don’t have to give them this, but it’ll help you talk in the same language. This section is here so you know what knobs they actually have.

### 3.1 Global theme files

Typical shadcn setup has:

- `tailwind.config.*` for theme values and plugins.  [oai_citation:14‡Shadcn UI](https://ui.shadcn.com/docs/components-json?utm_source=chatgpt.com)  
- `app/globals.css` (or similar) where:
  - `:root` defines CSS vars for light theme.
  - `.dark` defines CSS vars for dark theme.
- `components.json` pointing at Tailwind/aliases so the shadcn CLI knows where to generate files.  [oai_citation:15‡Shadcn UI](https://ui.shadcn.com/docs/components-json?utm_source=chatgpt.com)  

The important part for you: **all your brand choices get encoded as those variables**.

### 3.2 Component design knobs

Each shadcn component is just a React file with:

- A root element and Tailwind classes.
- A `className` merge helper.
- Sometimes variant utilities (e.g. `variant="outline"`, `size="sm"`).

Your friend will:

- Normalize things like:
  - Button sizes, paddings, icon spacing.
  - Input heights, label spacing.
  - Card padding, header layout.
- Use your tokens to keep everything aligned.

If you want specifics, you can say:

- “Buttons should have same height as inputs.”
- “Small buttons are only for icon-only, not for primary actions.”
- “Danger actions must use the destructive variant.”

---

## 4. Concrete “Brand Input” form you can fill out

You can literally copy this section, fill it in, and hand it back.

### 4.1 Brand

- **Product name:**
- **One-sentence elevator pitch:**
- **3–6 adjectives (tone):**
- **Default theme:** `light | dark`
- **Overall vibe:**
  - `B2B dashboard | developer tool | consumer app | marketing site | other: ______`
- **Motion personality:**
  - `minimal | subtle | playful` and any notes:
  - Notes:

- **Inspiration examples:**
  - “Looks somewhat like: ______”
  - “But avoid: ______”

---

### 4.2 Palette

- **Primary color (for buttons, links, accents):**
  - Rough description:
  - Hex or Tailwind color ref (e.g. `#2563eb` / blue-600):
  - Dark-mode adjustment (if any):

- **Accent color (optional):**
  - Usage: “chips, charts, empty states…”
  - Color / description:

- **Semantic colors:**
  - Success:
  - Warning:
  - Destructive:

- **Background strategy:**
  - `Paper | Glass | Terminal | Other`:
  - Notes (cards vs page background, density):

- **Neutral / grayscale preference:**
  - “Cool gray vs warm vs neutral:”
  - “High-contrast vs softer:”

---

### 4.3 Typography

- **Display font (if any):**
  - Usage: logo, H1, etc.
  - Style: `serif | sans | geometric | rounded | condensed`:

- **Body font:**
  - Name or style:
  - Notes on tone: “serious, friendly, etc.”

- **Code font (if applicable):**
  - Name or style:

- **Hierarchy:**
  - H1 size relative to body:
  - Headings boldness:
  - All caps? Where?

- **Special rules:**
  - “Buttons use semi-bold.”
  - “Navigation uses small caps, tracking.”

---

### 4.4 Tailwind tokens / utilities

- **Spacing feel:**
  - `compact | medium | spacious`
  - Specific notes for:
    - Forms:
    - Cards:
    - Page sections:

- **Radius:**
  - Global radius vibe:
    - `sharp | slightly rounded | very rounded / pill`
  - Any exceptions:
    - e.g. “Modals more rounded than cards.”

- **Shadows:**
  - Overall preference:
    - `no shadow | subtle | medium | strong`
  - Where to avoid shadows:
    - e.g. “Tables have no drop shadows; only cards.”

- **Animations:**
  - Allowed level:
    - `off | subtle | noticeable`
  - Notes:
    - “Only use for transitions and skeleton shimmer; no bouncing.”

---

### 4.5 Icons

- **Icon library preference:**
  - `Lucide | other (describe style)`
- **Style:**
  - `outline | solid | duotone`
  - Stroke width preference:
  - Corner style: `sharp | rounded`:

- **Usage:**
  - Where icons are allowed:
    - Navigation:
    - Buttons:
    - Badges:
    - Empty states:

- **Rules:**
  - “Don’t mix multiple icon styles.”
  - “No emoji as primary icons.”

---

### 4.6 UX patterns

#### Modals vs drawers

- **Use modals for:**
  - e.g. “confirmations, quick edits up to 2–3 fields.”

- **Use drawers / sheets for:**
  - e.g. “editing items while list remains visible, filters, side settings.”

- **Mobile rules:**
  - e.g. “Use bottom sheets for actions; full screens for longer flows.”

#### Tables

- **Default density:**
  - Row height target:
  - Padding preferences:

- **Compact mode:**
  - Available? `yes/no`
  - Where:

- **Grid style:**
  - `row striping | horizontal rules | minimal grid`:

- **Other:**
  - Text truncation rules:
  - Numeric alignment rules:

#### Loading / feedback

- **Skeletons:**
  - When to use:
  - Examples (pages, tables, cards):

- **Spinners:**
  - Where:
  - Button loading style:

- **Toasts:**
  - When to show:
  - Default duration:
  - Tone guidelines:

#### Navigation & discovery

- **Primary navigation style:**
  - `sidebar | top nav | mixed | other`:
- **Secondary navigation:**
  - `tabs | breadcrumbs | dropdowns`:

- **Command palette (`⌘K` style):**
  - Use? `yes/no`
  - What should appear there:

---

## 5. Optional “advanced” preferences (if you want to go further)

These are nice-to-haves but not required.

### 5.1 Accessibility & contrast

shadcn/ui and Radix handle ARIA roles, focus management, etc., but your brand choices must not wreck contrast.  [oai_citation:16‡shadcn.io](https://www.shadcn.io/ui?utm_source=chatgpt.com)  

You can specify:

- Minimum contrast target:
  - “Follow WCAG AA where possible.”
- Don’t use:
  - Text on pure primary without verifying contrast.
- Focus styles:
  - “Visible focus ring, but using primary color.”

### 5.2 Content tone

You can give a few examples of how you want microcopy to feel:

- Errors: “Something went wrong. Try again.” vs “Oops! That didn’t work.”
- Empty states: direct vs playful.
- Confirmation dialogs: “Delete X?” vs “Are you sure you want to delete X? This cannot be undone.”

Your friend can then keep placeholders consistent while you fill final copy later.

### 5.3 The “minimum viable component set”

If you want to sanity-check scope, here’s a reasonable “Phase 1” set your friend will probably install/configure:

- Layout:
  - `Container`, `Card`, `Tabs`, `ScrollArea`.
- Forms:
  - `Button`, `Input`, `Textarea`, `Checkbox`, `Select`, `Switch`, `Label`, `Form` wrapper.
- Feedback:
  - `Alert`, `Toast`, `Skeleton`, `Progress`, `Tooltip`.
- Overlay:
  - `Dialog`, `Drawer/Sheet`, `Popover`, `DropdownMenu`.
- Data display:
  - `Table`, `Badge`, `Avatar`, `Separator`, `Breadcrumb`.
- Navigation:
  - `Navbar`/Sidebar (composed from primitives), `Tabs`, `Command`.

If there are any components you absolutely don’t want:

- e.g. “No carousels.”
- “Avoid steppers; prefer one-page forms.”

Call that out explicitly.

---

## 6. How to send this to your friend

1. Fill out the sections:
   - 2.1–2.6 at minimum.
2. If you don’t know an answer, just say “don’t care” or “use defaults.”
3. Send them the filled-in markdown file.

They’ll then:

- Encode your decisions into CSS variables + Tailwind theme tokens.  [oai_citation:17‡Tailwind CSS](https://tailwindcss.com/docs/adding-custom-styles?utm_source=chatgpt.com)  
- Update shadcn components to consistently use those tokens.
- Implement the UX patterns (dialogs vs drawers, table density, toasts, skeletons) based on what you wrote.

---

## 7. TL;DR for your friend (you can paste this as a one-liner summary)

> “I’ll give you brand adjectives, color and type preferences, spacing/radius/shadow vibe, icon style (probably Lucide), and rules for modals vs drawers, table density, skeletons/toasts, and navigation. You convert that into shadcn/Tailwind tokens and consistent components.”
</shadcn context>

---

## Notes & Learnings (TaskTree specific)

- Decision: we are proceeding with Shadcn UI (Tailwind + Radix) for the TaskTree frontend.
- Framework: current codebase is Vite + React + TypeScript; we will integrate Tailwind + Shadcn (not Next.js).
- Testing: Playwright already present; we will add UI coverage for nav/buttons/flows/traces and fail on console errors.
- Logs: Playwright reports/test-results are now included in `logs/log_sources.yaml` for debugging frontend issues.
- Implementation in progress: Tailwind config + theme tokens added (neutral surfaces + deep navy primary, accent blue); `@` path alias configured in Vite/tsconfig; base shadcn primitives (button, card, badge, tabs, table, alert, skeleton, toast, scroll-area, separator) added.
- UI rebuild in-flight: App shell now uses tabs instead of inline buttons; Flows/Traces/Run pages are being restyled with shadcn components and improved error/loading/empty states.
- Testing note: a new Playwright “UI smoke” test creates a traced run, navigates tabs, opens run detail, and fails on any console/page errors; selectors updated for the tabbed UI.

Update this section as we learn more (e.g., final palette/typography tokens, chosen nav patterns, any deviations from the above guide).
