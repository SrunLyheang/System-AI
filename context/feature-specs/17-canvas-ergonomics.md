Add a floating control bar for zoom and undo/redo, then wire the same actions to keyboard shortcuts.

## Implementation

1. Add a pill-shaped control bar at the bottom-left of the canvas.

   It should sit above the shape panel and include three groups:
   - zoom controls: zoom out, fit view, zoom in
   - selection controls: select all nodes (disabled when the canvas is empty)
   - history controls: undo, redo

   Separate the groups with thin dividers.

2. Wire the zoom controls to the React Flow instance.
   - zoom in
   - zoom out
   - fit view
   - use a short animation so the movement feels smooth

3. Wire undo and redo to Liveblocks history.
   - use the existing Liveblocks undo/redo hooks
   - disable undo when there is nothing to undo
   - disable redo when there is nothing to redo
   - keep disabled buttons visually dimmed

4. Create a `useKeyboardShortcuts` hook in `hooks/`.

   The hook should:
   - receive the React Flow instance
   - receive undo and redo handlers
   - listen for keyboard shortcuts on `window`
   - ignore shortcuts while typing in inputs, textareas, or editable text fields

5. Support these shortcuts:
   - `+` or `=` to zoom in
   - `-` to zoom out
   - `Cmd/Ctrl + Z` to undo
   - `Cmd/Ctrl + Shift + Z` to redo
   - `Cmd/Ctrl + Y` to redo
   - `Cmd/Ctrl + A` to select all nodes

6. Remove the minimap at the bottom right

7. Keep the key → action mapping in a pure, DOM-free helper (`matchShortcut`)
   so it can be unit-checked without a browser.

## Scope Limits

- don’t change the shape panel
- don’t change node or edge rendering
- don’t change the existing collaborative state setup

## Check When Done

- Control bar is added to the canvas.
- Zoom actions use the React Flow instance.
- Undo and redo use Liveblocks history.
- Select all marks every node selected via the synced node state.
- Keyboard shortcuts are handled in `hooks/useKeyboardShortcuts`.
- Shortcut handling skips editable fields.
- `hooks/use-keyboard-shortcuts.check.ts` passes.
- `npm run build` passes.
