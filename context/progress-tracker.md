# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Auth — Clerk provider, sign-in/up pages, route protection, user menu (`context/feature-specs/03-auth.md`) — done

## Current Goal

- Define the immediate implementation goal here.

## Completed

- Design system setup (`context/feature-specs/01-design-system.md`): shadcn/ui installed and configured (`components.json`, `base-nova` preset), 7 components added unmodified (`components/ui/button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `tabs.tsx`, `textarea.tsx`, `scroll-area.tsx`), `lucide-react` installed, `lib/utils.ts` with `cn()` helper, dark theme tokens wired into `app/globals.css`.
- Verified: `tsc --noEmit`, `next build`, and `eslint` all pass clean; components render on a temporary route with the dark theme applied (screenshot-checked, then removed).
- Editor shell (`context/feature-specs/02-editor.md`): `components/editor/editor-navbar.tsx` (fixed-height top nav, left/center/right sections, sidebar toggle button swapping `PanelLeftOpen`/`PanelLeftClose` based on `isSidebarOpen`, dark `bg-surface` with a subtle bottom border and an outlined toggle button), `components/editor/project-sidebar.tsx` (`fixed` floating overlay so it doesn't push content, slides in from the left via `isOpen`/translate transform, header with "Projects" title + close button, shadcn `Tabs` for My projects/Shared each with an empty placeholder, full-width `New project` button with `Plus` icon), and `components/editor/editor-dialog.tsx` (reusable dialog styling pattern wrapping `components/ui/dialog.tsx` with project color tokens, supporting title/description/footer props — not wired to any real feature yet, per spec's "do not build the actual dialog" instruction).
- Verified: `tsc --noEmit`, `next build`, and `eslint components/editor --max-warnings=0` all pass clean for the editor shell components.
- Auth (`context/feature-specs/03-auth.md`): `lib/clerk-appearance.ts` (Clerk `dark` theme from `@clerk/ui/themes`, every appearance variable mapped to the app's existing `var(--...)` tokens, no hardcoded colors), `app/layout.tsx` wraps the root layout in `ClerkProvider` with that appearance, `components/auth/auth-layout.tsx` (two-panel layout: logo/tagline/feature list on the left on large screens, centered form on the right, form-only below `lg`, no gradients/hero/cards), `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx` (Clerk's `SignIn`/`SignUp` components inside `AuthLayout`), `proxy.ts` at the project root (`clerkMiddleware` + `createRouteMatcher` reading `NEXT_PUBLIC_CLERK_SIGN_IN_URL`/`NEXT_PUBLIC_CLERK_SIGN_UP_URL` as the only public routes, everything else calls `auth.protect()`), `app/page.tsx` now a server component redirecting to `/editor` (signed in) or `/sign-in` (signed out), `components/editor/editor-navbar.tsx` gains Clerk's `UserButton` in the right section.
- Added `app/editor/page.tsx`: a minimal composition of the existing (previously unwired) `EditorNavbar` + `ProjectSidebar` components, needed only so `/editor` exists as the post-sign-in redirect target and so `UserButton` has somewhere to render. No new feature logic — just wiring.
- Verified: `next build` and `eslint app components lib proxy.ts --max-warnings=0` both pass clean.

## In Progress

- None yet.

## Next Up

- Build out the actual `/editor` experience (currently just navbar + sidebar shell, no canvas).

## Open Questions

- Resolved: `.env.local` now has real Clerk keys plus `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`. Without those two, `proxy.ts`'s public-route matcher silently matched nothing (`"undefined(.*)"`), so `/sign-in`/`/sign-up` were treated as protected and Clerk fell back to redirecting through its hosted Account Portal (`accounts.dev`) instead of the local pages — also the cause of the "Failed to fetch RSC payload" console error during that cross-origin redirect. Also added `afterSignOutUrl="/sign-in"` on `ClerkProvider` in `app/layout.tsx` so sign-out navigates straight to the public sign-in route instead of through the protected `/`.

## Architecture Decisions

- Dark theme tokens (`--bg-*`, `--text-*`, `--accent-*`, `--state-*`) live in `app/globals.css` `:root` and are mapped onto shadcn's standard semantic tokens (`--background`, `--foreground`, `--card`, `--primary`, etc.) so every shadcn component is dark by default with no `.dark` class needed — the app has no light mode.
- Do not register a custom Tailwind color theme key named `base` (e.g. `--color-base`). It collides with Tailwind's built-in `text-base` font-size utility (both compile to a class literally named `.text-base`), and the color definition wins — silently turning every `text-base` usage across shadcn components into a text-color rule instead of a font-size rule. Discovered when `CardTitle` rendered nearly invisible (dark-on-dark). The `bg-background` utility (already mapped to the same page-background value) covers the same need without the collision.

## Session Notes

- Design system phase implemented and verified end to end (typecheck, build, lint, visual check via a temporary route since removed). Ready to move to the next feature unit.
