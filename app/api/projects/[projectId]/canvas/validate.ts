const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/** Minimal React Flow node shape — enough that loading it back can't break the
 *  editor for every collaborator. */
export const isCanvasNode = (v: unknown): boolean =>
  isObject(v) && typeof v.id === "string" && isObject(v.position);

/** Minimal React Flow edge shape. */
export const isCanvasEdge = (v: unknown): boolean =>
  isObject(v) &&
  typeof v.id === "string" &&
  typeof v.source === "string" &&
  typeof v.target === "string";
