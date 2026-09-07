"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { CanvasSaveStatus } from "@/hooks/use-canvas-persistence";

interface CanvasSaveValue {
  status: CanvasSaveStatus;
  /** Trigger the same write the canvas autosave debounce performs. */
  save: () => void;
  /** Called by the canvas once it owns the real status + save function. */
  register: (next: { status: CanvasSaveStatus; save: () => void }) => void;
}

const noop = () => {};

const CanvasSaveContext = createContext<CanvasSaveValue>({
  status: "idle",
  save: noop,
  register: noop,
});

/**
 * Bridges the canvas's save state (owned deep inside the Liveblocks room, where
 * the React Flow handles live) to the workspace navbar's Save button, which
 * renders outside the room. Replaces the earlier `onSaveStatusChange` /
 * `onRegisterSave` prop relay through `CanvasRoom`.
 */
export function CanvasSaveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    status: CanvasSaveStatus;
    save: () => void;
  }>({ status: "idle", save: noop });

  const value = useMemo<CanvasSaveValue>(
    () => ({ ...state, register: setState }),
    [state],
  );

  return (
    <CanvasSaveContext.Provider value={value}>
      {children}
    </CanvasSaveContext.Provider>
  );
}

/** Navbar side: current `{ status, save }` for the Save button. */
export function useCanvasSave(): { status: CanvasSaveStatus; save: () => void } {
  const { status, save } = useContext(CanvasSaveContext);
  return { status, save };
}

/** Canvas side: hand the provider the live status + save function. */
export function useRegisterCanvasSave(): CanvasSaveValue["register"] {
  return useContext(CanvasSaveContext).register;
}
