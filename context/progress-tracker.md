# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Editor Shell — Navbar, Sidebar, Dialog Pattern (`context/feature-specs/02-editor.md`) — done

## Current Goal

- Define the immediate implementation goal here.

## Completed

- Design system setup (`context/feature-specs/01-design-system.md`): shadcn/ui installed and configured (`components.json`, `base-nova` preset), 7 components added unmodified (`components/ui/button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `tabs.tsx`, `textarea.tsx`, `scroll-area.tsx`), `lucide-react` installed, `lib/utils.ts` with `cn()` helper, dark theme tokens wired into `app/globals.css`.
- Verified: `tsc --noEmit`, `next build`, and `eslint` all pass clean; components render on a temporary route with the dark theme applied (screenshot-checked, then removed).
- Editor shell (`context/feature-specs/02-editor.md`): `components/editor/editor-navbar.tsx` (fixed-height top nav, left/center/right sections, sidebar toggle button swapping `PanelLeftOpen`/`PanelLeftClose` based on `isSidebarOpen`, dark `bg-surface` with a subtle bottom border and an outlined toggle button), `components/editor/project-sidebar.tsx` (`fixed` floating overlay so it doesn't push content, slides in from the left via `isOpen`/translate transform, header with "Projects" title + close button, shadcn `Tabs` for My projects/Shared each with an empty placeholder, full-width `New project` button with `Plus` icon), and `components/editor/editor-dialog.tsx` (reusable dialog styling pattern wrapping `components/ui/dialog.tsx` with project color tokens, supporting title/description/footer props — not wired to any real feature yet, per spec's "do not build the actual dialog" instruction).
- Verified: `tsc --noEmit`, `next build`, and `eslint components/editor --max-warnings=0` all pass clean for the editor shell components.

## In Progress

- None yet.

## Next Up

- Add the next planned feature unit here.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Dark theme tokens (`--bg-*`, `--text-*`, `--accent-*`, `--state-*`) live in `app/globals.css` `:root` and are mapped onto shadcn's standard semantic tokens (`--background`, `--foreground`, `--card`, `--primary`, etc.) so every shadcn component is dark by default with no `.dark` class needed — the app has no light mode.
- Do not register a custom Tailwind color theme key named `base` (e.g. `--color-base`). It collides with Tailwind's built-in `text-base` font-size utility (both compile to a class literally named `.text-base`), and the color definition wins — silently turning every `text-base` usage across shadcn components into a text-color rule instead of a font-size rule. Discovered when `CardTitle` rendered nearly invisible (dark-on-dark). The `bg-background` utility (already mapped to the same page-background value) covers the same need without the collision.

## Session Notes

- Design system phase implemented and verified end to end (typecheck, build, lint, visual check via a temporary route since removed). Ready to move to the next feature unit.
