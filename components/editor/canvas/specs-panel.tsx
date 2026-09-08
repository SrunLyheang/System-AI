"use client";

import { useEffect, useState } from "react";

import { Download, FileText, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SpecMeta {
  id: string;
  createdAt: string;
  filename: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Trigger a browser download of a spec via the access-checked download route.
 *  The route sets `Content-Disposition: attachment`, so the browser saves the
 *  file instead of navigating. */
function downloadSpec(projectId: string, specId: string) {
  const link = document.createElement("a");
  link.href = `/api/projects/${projectId}/specs/${specId}/download`;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Specs tab of the AI sidebar. Lists the generated specs for the current
 *  project, opens a Markdown preview in a modal, and downloads any spec. Spec
 *  content is never held in long-lived state — it's fetched when a preview
 *  opens and dropped when it closes. */
export function SpecsPanel({ projectId }: { projectId: string }) {
  const [specs, setSpecs] = useState<SpecMeta[] | null>(null);
  const [listError, setListError] = useState(false);

  const [selected, setSelected] = useState<SpecMeta | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/specs`)
      .then((res) => {
        if (!res.ok) throw new Error(`specs request failed: ${res.status}`);
        return res.json() as Promise<{ specs: SpecMeta[] }>;
      })
      .then((data) => {
        if (!cancelled) setSpecs(data.specs);
      })
      .catch(() => {
        if (!cancelled) setListError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // `selected` only ever goes null → spec → null (the list sits behind the
  // modal), so `content`/`previewError` are already reset by the close handler
  // before this runs — no need to clear them here.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    fetch(`/api/projects/${projectId}/specs/${selected.id}/download`)
      .then((res) => {
        if (!res.ok) throw new Error(`spec content failed: ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch(() => {
        if (!cancelled) setPreviewError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, projectId]);

  return (
    <>
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-3 text-sm">
        {specs === null && !listError ? (
          <p className="my-auto flex items-center justify-center gap-2 text-copy-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading specs…
          </p>
        ) : listError ? (
          <p className="my-auto text-center text-copy-muted">
            Couldn’t load specs. Try reopening the panel.
          </p>
        ) : specs && specs.length === 0 ? (
          <p className="my-auto text-center text-copy-muted">
            No specs generated yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {specs?.map((spec) => (
              <li
                key={spec.id}
                className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-elevated"
              >
                <button
                  type="button"
                  onClick={() => setSelected(spec)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none"
                >
                  <FileText className="h-4 w-4 shrink-0 text-copy-muted" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-copy-primary">
                      {spec.filename}
                    </span>
                    <span className="text-[11px] text-copy-muted">
                      {formatDate(spec.createdAt)}
                    </span>
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Download ${spec.filename}`}
                  onClick={() => downloadSpec(projectId, spec.id)}
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setContent(null);
            setPreviewError(false);
          }
        }}
      >
        <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">
              {selected?.filename ?? "Spec"}
            </DialogTitle>
            {selected ? (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Download ${selected.filename}`}
                onClick={() => downloadSpec(projectId, selected.id)}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {previewError ? (
              <p className="text-copy-muted">Couldn’t load this spec.</p>
            ) : content === null ? (
              <p className="flex items-center gap-2 text-copy-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </p>
            ) : (
              <div className="space-y-3 text-sm text-copy-secondary [&_a]:underline [&_code]:rounded [&_code]:bg-elevated [&_code]:px-1 [&_code]:py-0.5 [&_h1]:mt-4 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-copy-primary [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-copy-primary [&_h3]:mt-3 [&_h3]:font-medium [&_h3]:text-copy-primary [&_li]:ml-4 [&_li]:list-disc [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-elevated [&_pre]:p-3 [&_table]:block [&_table]:overflow-x-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
