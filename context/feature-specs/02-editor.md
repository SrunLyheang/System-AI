We need the base chrome components that frame every editor screen - the top navbar and left side bar shell. These will be reused and extended in every chapter that follows.

### Editor Navbar

create `components/editor/editor-navbar.tsx`
Requirments:
-fixed-height top nav bar
-left, center and right sections
-left section contains sidebar toggle button
-use `PanelLeftopen`/`PanelLeftClose` icons based on sidebar state
-right section stays empty for now
-dark background with subtle button border

### Project sidebar

Create `components/editor/project-sidebar.tsx`.

Requiremnts:
-sidebar should float above the editor canvas
-opening it should not push page content
-slides in from the left
-accepts `isOpen`and `Onclose` props
-header with `projects` title + close button
-shadcn `Tabs`:
-My projects
-Shared
-both tabs show empty placeholder state
-full width `New project` button at the buttom with `Plus` icon

### Dialog pattern

Use the existing color tokens from `global.css` for a dialog styling.
support:
-title
-description
-footer actions

DO not build the actual dialog yet

### check when done

-new components compile without Typescript errors
-no lint errors
-dialog pattern is ready for future use
