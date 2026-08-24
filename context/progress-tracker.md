# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Design System & UI Primitives (`context/feature-specs/01-design-system.md`) — done

## Current Goal

- Define the immediate implementation goal here.

## Completed

- Design system setup (`context/feature-specs/01-design-system.md`): shadcn/ui installed and configured (`components.json`, `base-nova` preset), 7 components added unmodified (`components/ui/button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `tabs.tsx`, `textarea.tsx`, `scroll-area.tsx`), `lucide-react` installed, `lib/utils.ts` with `cn()` helper, dark theme tokens wired into `app/globals.css`.
- Verified: `tsc --noEmit`, `next build`, and `eslint` all pass clean; components render on a temporary route with the dark theme applied (screenshot-checked, then removed).

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
