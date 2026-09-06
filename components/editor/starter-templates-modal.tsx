"use client"

import { Download } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  CANVAS_TEMPLATES,
  templateBounds,
  type CanvasTemplate,
} from "@/components/editor/starter-templates"

interface StarterTemplatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the chosen template; the modal closes right after. */
  onImport: (template: CanvasTemplate) => void
}

function StarterTemplatesModal({
  open,
  onOpenChange,
  onImport,
}: StarterTemplatesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border border-surface-border bg-elevated p-8 text-copy-primary sm:max-w-350">
        <DialogHeader className="gap-1 border-b border-surface-border-subtle pb-5">
          <DialogTitle className="text-2xl font-semibold text-copy-primary">
            Import Template
          </DialogTitle>
          <DialogDescription className="text-sm text-copy-muted">
            Choose a starter template to pre-populate your canvas. Any existing
            nodes will be replaced — use{" "}
            <kbd className="rounded border border-surface-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-copy-secondary">
              ⌘Z
            </kbd>{" "}
            to undo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[70vh] grid-cols-3 gap-6 overflow-y-auto pt-2">
          {CANVAS_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="flex flex-col gap-5 rounded-xl border border-surface-border p-5"
            >
              <div className="overflow-hidden rounded-lg border border-surface-border-subtle bg-surface">
                <TemplatePreview template={template} />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <p className="text-lg font-semibold text-copy-primary">
                  {template.name}
                </p>
                <p className="text-sm leading-relaxed text-copy-muted">
                  {template.description}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  onImport(template)
                  onOpenChange(false)
                }}
              >
                <Download className="h-4 w-4" />
                Import
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const PREVIEW_W = 420
const PREVIEW_H = 340
const PREVIEW_PAD = 40

/** Lightweight static diagram: nodes drawn by shape/color, edges as plain
 *  lines between node centers. No React Flow instance, no labels. */
function TemplatePreview({ template }: { template: CanvasTemplate }) {
  const bounds = templateBounds(template)
  const scale = Math.min(
    (PREVIEW_W - PREVIEW_PAD * 2) / bounds.width,
    (PREVIEW_H - PREVIEW_PAD * 2) / bounds.height,
  )
  const offX =
    PREVIEW_PAD + (PREVIEW_W - PREVIEW_PAD * 2 - bounds.width * scale) / 2
  const offY =
    PREVIEW_PAD + (PREVIEW_H - PREVIEW_PAD * 2 - bounds.height * scale) / 2

  const box = (node: CanvasTemplate["nodes"][number]) => {
    const x = offX + (node.position.x - bounds.minX) * scale
    const y = offY + (node.position.y - bounds.minY) * scale
    const w = (node.width ?? 160) * scale
    const h = (node.height ?? 80) * scale
    return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 }
  }
  const byId = new Map(template.nodes.map((n) => [n.id, box(n)]))

  return (
    <svg
      viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`}
      className="block h-72 w-full"
      role="img"
      aria-label={`${template.name} diagram preview`}
    >
      {template.edges.map((e) => {
        const a = byId.get(e.source)
        const b = byId.get(e.target)
        if (!a || !b) return null
        return (
          <line
            key={e.id}
            x1={a.cx}
            y1={a.cy}
            x2={b.cx}
            y2={b.cy}
            stroke="var(--text-faint)"
            strokeWidth={1.25}
          />
        )
      })}
      {template.nodes.map((node) => {
        const b = byId.get(node.id)
        if (!b) return null
        return (
          <PreviewShape
            key={node.id}
            shape={node.data.shape}
            box={b}
            accent={node.data.textColor}
          />
        )
      })}
    </svg>
  )
}

type PreviewBox = { x: number; y: number; w: number; h: number }

function PreviewShape({
  shape,
  box,
  accent,
}: {
  shape: CanvasTemplate["nodes"][number]["data"]["shape"]
  box: PreviewBox
  accent: string
}) {
  const { x, y, w, h } = box
  // The real node fills are near-black by design and read as blobs at this
  // size with no labels — tint each shape with its accent color instead.
  const common = { fill: accent, fillOpacity: 0.22, stroke: accent, strokeWidth: 2 }

  if (shape === "circle") {
    return (
      <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} {...common} />
    )
  }
  if (shape === "diamond") {
    const pts = [
      [x + w / 2, y],
      [x + w, y + h / 2],
      [x + w / 2, y + h],
      [x, y + h / 2],
    ]
    return <polygon points={pts.map((p) => p.join(",")).join(" ")} {...common} />
  }
  if (shape === "hexagon") {
    const q = w * 0.25
    const pts = [
      [x + q, y],
      [x + w - q, y],
      [x + w, y + h / 2],
      [x + w - q, y + h],
      [x + q, y + h],
      [x, y + h / 2],
    ]
    return <polygon points={pts.map((p) => p.join(",")).join(" ")} {...common} />
  }
  // rectangle, pill, cylinder — rounded rect (pill fully rounded)
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={shape === "pill" ? h / 2 : 8}
      {...common}
    />
  )
}

export { StarterTemplatesModal }
