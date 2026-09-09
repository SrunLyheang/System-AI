"use client";

import { useEffect, useRef } from "react";

/**
 * The sign-in panel canvas: a scripted loop of the product's core moment —
 * an AI prompt types itself, five services drop onto the board and wire up,
 * two teammate cursors drift, and hovering tilts you "into" the scene.
 *
 * All animation is native (WAAPI + rAF + IntersectionObserver), no React
 * state in the animation path, fully torn down on unmount. Honors
 * prefers-reduced-motion by rendering the finished board statically.
 */

type NodeDef = {
  id: string;
  kind: string;
  label: string;
  x: number;
  y: number;
  c: string;
};

const NODES: NodeDef[] = [
  { id: "client", kind: "client", label: "Web Client", x: 8, y: 26, c: "var(--ac-n-blue)" },
  { id: "gw", kind: "service", label: "API Gateway", x: 196, y: 12, c: "var(--ac-n-teal)" },
  { id: "short", kind: "service", label: "Shortener Service", x: 196, y: 180, c: "var(--ac-n-purple)" },
  { id: "cache", kind: "store", label: "Redis Cache", x: 384, y: 96, c: "var(--ac-n-orange)" },
  { id: "analytics", kind: "database", label: "Analytics DB", x: 384, y: 264, c: "var(--ac-n-green)" },
];
const EDGES: ReadonlyArray<readonly [string, string]> = [
  ["client", "gw"],
  ["gw", "short"],
  ["short", "cache"],
  ["short", "analytics"],
];
const NW = 148;
const NH = 46;
const BW = 540;
const PROMPT = "Design a URL shortener with caching and analytics";

const AC_CSS = `
.ac-root {
  --ac-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --ac-n-blue: #52a8ff; --ac-n-purple: #bf7af0; --ac-n-orange: #ff990a;
  --ac-n-green: #62c073; --ac-n-teal: #0ac7b4;
}
.ac-shell {
  position: relative; width: 100%; aspect-ratio: 1 / 0.84;
  border: 1px solid var(--border-default); border-radius: 16px;
  background: linear-gradient(180deg, var(--bg-surface), #0d0d10);
  box-shadow: 0 40px 120px -50px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.03);
  overflow: hidden;
  transition: transform .55s var(--ac-ease), box-shadow .55s var(--ac-ease);
}
.ac-shell::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0) 0 0 / 22px 22px;
  transition: background-color .4s ease;
}
.ac-shell.ac-live { transform: scale(1.015); box-shadow: 0 54px 150px -46px rgba(0,0,0,0.95), 0 0 0 1px rgba(0,200,212,0.22); }
.ac-shell.ac-live::after { background-color: rgba(0,200,212,0.03); }
.ac-shell:hover, .ac-shell:hover * { cursor: none; }
.ac-grid-glow {
  position: absolute; inset: 0; pointer-events: none; opacity: 0;
  background: radial-gradient(220px circle at var(--gx,50%) var(--gy,50%), rgba(0,200,212,0.14), transparent 70%);
  transition: opacity .45s ease;
}
.ac-shell.ac-live .ac-grid-glow { opacity: 1; }
.ac-topbar {
  position: absolute; inset: 0 0 auto 0; z-index: 6;
  display: flex; align-items: center; gap: 9px; padding: 11px 13px;
  background: linear-gradient(180deg, rgba(17,17,20,0.96), rgba(17,17,20,0));
  font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 12px; color: var(--text-muted);
}
.ac-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-ai); flex: none; }
.ac-prompt { color: var(--text-secondary); }
.ac-caret { display: inline-block; width: 7px; height: 14px; background: var(--accent-primary); margin-left: 2px; vertical-align: -2px; animation: ac-blink 1s steps(1) infinite; }
@keyframes ac-blink { 50% { opacity: 0; } }
.ac-hint {
  position: absolute; top: 12px; right: 13px; z-index: 7;
  font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 10.5px; letter-spacing: 0.04em; color: var(--accent-primary);
  padding: 4px 9px; border: 1px solid rgba(0,200,212,0.3); border-radius: 999px; background: rgba(0,200,212,0.06);
  opacity: 0; transform: translateY(-4px); transition: opacity .35s ease, transform .35s var(--ac-ease);
}
.ac-shell.ac-live .ac-hint { opacity: 1; transform: none; }
.ac-board { position: absolute; inset: 0; perspective: 1000px; }
.ac-board-inner {
  position: absolute; left: 50%; top: 53%; width: 540px; height: 420px;
  transform: translate(-50%,-50%) scale(var(--ac-board-scale,1));
  transform-style: preserve-3d; transition: transform .4s var(--ac-ease);
}
.ac-shell.ac-live .ac-board-inner { transition: transform .09s linear; }
.ac-edges { position: absolute; inset: 0; overflow: visible; pointer-events: none; }
.ac-edges path {
  fill: none; stroke: var(--text-faint); stroke-width: 1.6; stroke-linecap: round;
  stroke-dasharray: var(--len); stroke-dashoffset: var(--len); transition: stroke .4s ease;
}
.ac-shell.ac-live .ac-edges path { stroke: #6a6a7a; }
.ac-node {
  position: absolute; width: 148px; padding: 10px 12px; border-radius: 11px;
  background: var(--bg-elevated); border: 1px solid var(--nc, var(--border-subtle));
  box-shadow: 0 10px 30px -12px rgba(0,0,0,0.8);
  font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 12px; line-height: 1.35; color: var(--text-primary);
  transition: transform .4s var(--ac-ease), box-shadow .4s var(--ac-ease);
}
.ac-shell.ac-live .ac-node { transform: translateZ(26px); box-shadow: 0 22px 44px -16px rgba(0,0,0,0.9); }
.ac-kind { color: var(--nc); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; display: block; margin-bottom: 3px; opacity: 0.85; }
.ac-handle { position: absolute; width: 7px; height: 7px; border-radius: 50%; background: #f5f5f7; border: 1.5px solid var(--bg-base); }
.ac-handle.r { right: -4px; top: calc(50% - 4px); }
.ac-handle.l { left: -4px; top: calc(50% - 4px); }
.ac-cursor { position: absolute; top: 0; left: 0; z-index: 8; pointer-events: none; display: flex; align-items: flex-start; gap: 4px; will-change: transform; }
.ac-cursor svg { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); }
.ac-tag { font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 10.5px; font-weight: 500; padding: 2px 7px; border-radius: 6px; color: #0c0c0e; white-space: nowrap; transform: translateY(2px); }
.ac-you { z-index: 9; }
.ac-status {
  position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 7;
  font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 11.5px; padding: 6px 13px; border-radius: 999px;
  background: rgba(24,24,28,0.9); border: 1px solid var(--border-default); color: var(--text-secondary);
  display: flex; align-items: center; gap: 8px;
}
.ac-pulse { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-ai); }
.ac-status[data-state="working"] .ac-pulse { animation: ac-pulse 1.1s ease-in-out infinite; }
.ac-status[data-state="done"] .ac-pulse { background: var(--state-success); animation: none; }
@keyframes ac-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(1.9); } }
@media (max-width: 1180px) { .ac-root { --ac-board-scale: 0.82; } }
@media (prefers-reduced-motion: reduce) {
  .ac-caret { display: none; }
  .ac-shell, .ac-shell * { transition-duration: .001ms !important; animation: none !important; }
}
`;

function AuthCanvas() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const shell = root.querySelector<HTMLElement>(".ac-shell");
    const boardInner = root.querySelector<HTMLElement>(".ac-board-inner");
    const edgesSvg = root.querySelector<SVGSVGElement>(".ac-edges");
    const promptEl = root.querySelector<HTMLElement>(".ac-prompt");
    const caret = root.querySelector<HTMLElement>(".ac-caret");
    const statusEl = root.querySelector<HTMLElement>(".ac-status");
    const statusText = root.querySelector<HTMLElement>(".ac-status-text");
    const gridGlow = root.querySelector<HTMLElement>(".ac-grid-glow");
    const cur1 = root.querySelector<HTMLElement>('.ac-cursor[data-c="1"]');
    const cur2 = root.querySelector<HTMLElement>('.ac-cursor[data-c="2"]');
    if (
      !shell || !boardInner || !edgesSvg || !promptEl || !caret ||
      !statusEl || !statusText || !gridGlow || !cur1 || !cur2
    ) {
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // --- build nodes into the board -------------------------------------------
    const nodeEls: HTMLElement[] = [];
    for (const n of NODES) {
      const el = document.createElement("div");
      el.className = "ac-node";
      el.style.left = `${n.x}px`;
      el.style.top = `${n.y}px`;
      el.style.setProperty("--nc", n.c);
      el.style.opacity = "0";
      el.dataset.id = n.id;
      el.innerHTML =
        `<span class="ac-kind">${n.kind}</span>${n.label}` +
        `<span class="ac-handle l"></span><span class="ac-handle r"></span>`;
      boardInner.insertBefore(el, cur1);
      nodeEls.push(el);
    }
    const nodeById = (id: string) => nodeEls.find((el) => el.dataset.id === id);

    // --- build edges as cubic beziers between node edges ---------------------
    const centerOf = (n: NodeDef) => ({ x: n.x + NW / 2, y: n.y + NH / 2 });
    const edgeEls: SVGPathElement[] = [];
    for (const [a, b] of EDGES) {
      const na = NODES.find((n) => n.id === a);
      const nb = NODES.find((n) => n.id === b);
      if (!na || !nb) continue;
      const ca = centerOf(na);
      const cb = centerOf(nb);
      const dx = cb.x - ca.x;
      const dy = cb.y - ca.y;
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      if (Math.abs(dx) >= Math.abs(dy)) {
        // Farther apart horizontally: enter/exit the left/right sides.
        const ax = dx >= 0 ? ca.x + NW / 2 : ca.x - NW / 2;
        const bx = dx >= 0 ? cb.x - NW / 2 : cb.x + NW / 2;
        const mx = (ax + bx) / 2;
        p.setAttribute("d", `M ${ax} ${ca.y} C ${mx} ${ca.y}, ${mx} ${cb.y}, ${bx} ${cb.y}`);
      } else {
        // Vertically stacked: exit the bottom of the upper node and enter the
        // top of the lower one, so the edge never wraps around the boxes.
        const ay = dy >= 0 ? ca.y + NH / 2 : ca.y - NH / 2;
        const by = dy >= 0 ? cb.y - NH / 2 : cb.y + NH / 2;
        const my = (ay + by) / 2;
        p.setAttribute("d", `M ${ca.x} ${ay} C ${ca.x} ${my}, ${cb.x} ${my}, ${cb.x} ${by}`);
      }
      edgesSvg.appendChild(p);
      p.style.setProperty("--len", String(p.getTotalLength()));
      edgeEls.push(p);
    }

    const showBuilt = () => {
      for (const el of nodeEls) {
        el.style.opacity = "1";
        el.style.filter = "none";
      }
      for (const p of edgeEls) p.style.strokeDashoffset = "0";
      promptEl.textContent = PROMPT;
      caret.style.display = "none";
      statusEl.dataset.state = "done";
      statusText.textContent = "5 nodes · 4 edges";
    };
    showBuilt();

    // --- ambient teammate cursors ------------------------------------------
    const place = (el: HTMLElement, x: number, y: number) => {
      el.style.transform = `translate(${x}px, ${y}px)`;
    };
    const cursors = [
      { el: cur1, pos: { x: 60, y: 300 }, tgt: { x: 60, y: 300 } },
      { el: cur2, pos: { x: 430, y: 60 }, tgt: { x: 430, y: 60 } },
    ];
    for (const c of cursors) place(c.el, c.pos.x, c.pos.y);

    // Hide the OS pointer whenever it's over the shell (runs regardless of
    // reduced-motion; `cursor` inherits, so descendants pick it up too).
    const hideCursor = () => {
      shell.style.cursor = "none";
    };
    const showCursor = () => {
      shell.style.removeProperty("cursor");
    };
    shell.addEventListener("pointerenter", hideCursor);
    shell.addEventListener("pointerleave", showCursor);
    const detachCursorHide = () => {
      shell.removeEventListener("pointerenter", hideCursor);
      shell.removeEventListener("pointerleave", showCursor);
      shell.style.removeProperty("cursor");
    };

    if (reduce) {
      return () => {
        detachCursorHide();
        for (const el of nodeEls) el.remove();
        for (const p of edgeEls) p.remove();
      };
    }

    let cancelled = false;
    let cursorRaf = 0;
    let tiltRaf = 0;
    let ambientOn = false;
    let driftIntervalId = 0;

    const rand = () => ({ x: 20 + Math.random() * 480, y: 12 + Math.random() * 376 });
    const drift = () => {
      if (!ambientOn) return;
      for (const c of cursors) {
        c.pos.x += (c.tgt.x - c.pos.x) * 0.045;
        c.pos.y += (c.tgt.y - c.pos.y) * 0.045;
        place(c.el, c.pos.x, c.pos.y);
      }
      cursorRaf = requestAnimationFrame(drift);
    };
    // Ambient cursor drift only runs while the panel is on screen.
    const startAmbient = () => {
      if (ambientOn) return;
      ambientOn = true;
      driftIntervalId = window.setInterval(() => {
        for (const c of cursors) c.tgt = rand();
      }, 2600);
      cursorRaf = requestAnimationFrame(drift);
    };
    const stopAmbient = () => {
      ambientOn = false;
      window.clearInterval(driftIntervalId);
      driftIntervalId = 0;
      if (cursorRaf) cancelAnimationFrame(cursorRaf);
      cursorRaf = 0;
    };

    // --- hover = step inside: tilt + spotlight + your own cursor -----------
    const you = document.createElement("div");
    you.className = "ac-cursor ac-you";
    you.innerHTML =
      `<svg width="16" height="18" viewBox="0 0 16 18" fill="var(--accent-primary)" aria-hidden="true">` +
      `<path d="M0 0l16 6.5-6.6 2.2L6 16z"/></svg>` +
      `<span class="ac-tag" style="background:var(--accent-primary);color:#04211f">You</span>`;
    let inside = false;
    let nx = 0.5;
    let ny = 0.5;
    const applyTilt = () => {
      tiltRaf = 0;
      const rx = (0.5 - ny) * 9;
      const ry = (nx - 0.5) * 12;
      boardInner.style.transform =
        `translate(-50%,-50%) scale(var(--ac-board-scale,1)) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    };
    const onEnter = () => {
      inside = true;
      shell.classList.add("ac-live");
      boardInner.appendChild(you);
    };
    const onMove = (e: PointerEvent) => {
      if (!inside) return;
      const r = shell.getBoundingClientRect();
      nx = (e.clientX - r.left) / r.width;
      ny = (e.clientY - r.top) / r.height;
      gridGlow.style.setProperty("--gx", `${(nx * 100).toFixed(1)}%`);
      gridGlow.style.setProperty("--gy", `${(ny * 100).toFixed(1)}%`);
      // Map the pointer through the board's own rect + render scale so the
      // stand-in cursor lands under the real pointer — the board is centered
      // and may be scaled by --ac-board-scale, so shell-relative fractions
      // times the fixed 540x420 would be off.
      const br = boardInner.getBoundingClientRect();
      const boardScale = br.width / BW || 1;
      place(
        you,
        (e.clientX - br.left) / boardScale - 6,
        (e.clientY - br.top) / boardScale - 2,
      );
      if (!tiltRaf) tiltRaf = requestAnimationFrame(applyTilt);
    };
    const onLeave = () => {
      inside = false;
      shell.classList.remove("ac-live");
      you.remove();
      boardInner.style.transform = "translate(-50%,-50%) scale(var(--ac-board-scale,1))";
    };
    shell.addEventListener("pointerenter", onEnter);
    shell.addEventListener("pointermove", onMove);
    shell.addEventListener("pointerleave", onLeave);

    // --- scripted build loop ---------------------------------------------
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const typePrompt = async () => {
      caret.style.display = "inline-block";
      for (let i = 1; i <= PROMPT.length && !cancelled; i++) {
        promptEl.textContent = PROMPT.slice(0, i);
        await sleep(26);
      }
    };
    const loop = async () => {
      while (!cancelled) {
        for (const el of nodeEls) {
          el.style.opacity = "0";
          el.style.filter = "blur(6px)";
        }
        for (const p of edgeEls) p.style.strokeDashoffset = p.style.getPropertyValue("--len");
        statusEl.dataset.state = "idle";
        statusText.textContent = "idle";

        await sleep(600);
        if (cancelled) return;
        await typePrompt();
        if (cancelled) return;
        await sleep(320);
        if (cancelled) return;

        statusEl.dataset.state = "working";
        statusText.textContent = "AI mapping…";
        await sleep(520);
        if (cancelled) return;

        for (const n of NODES) {
          nodeById(n.id)?.animate(
            [
              { opacity: 0, filter: "blur(6px)", transform: "translateY(10px) scale(0.82)" },
              { opacity: 1, filter: "blur(0)", transform: "translateY(0) scale(1)" },
            ],
            { duration: 520, easing: "cubic-bezier(0.22,1,0.36,1)", fill: "forwards" },
          );
          await sleep(130);
          if (cancelled) return;
        }
        for (const p of edgeEls) {
          p.animate(
            [{ strokeDashoffset: p.style.getPropertyValue("--len") }, { strokeDashoffset: "0" }],
            { duration: 480, easing: "ease-in-out", fill: "forwards" },
          );
          await sleep(110);
          if (cancelled) return;
        }

        await sleep(260);
        if (cancelled) return;
        statusEl.dataset.state = "done";
        statusText.textContent = "5 nodes · 4 edges";

        await sleep(4400);
        if (cancelled) return;
        boardInner.animate(
          [{ opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }],
          { duration: 900, easing: "ease-in-out" },
        );
        await sleep(720);
      }
    };

    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            startAmbient();
            if (!started) {
              started = true;
              void loop();
            }
          } else {
            stopAmbient();
          }
        }
      },
      { threshold: 0.35 },
    );
    io.observe(shell);

    return () => {
      cancelled = true;
      detachCursorHide();
      stopAmbient();
      if (tiltRaf) cancelAnimationFrame(tiltRaf);
      io.disconnect();
      shell.removeEventListener("pointerenter", onEnter);
      shell.removeEventListener("pointermove", onMove);
      shell.removeEventListener("pointerleave", onLeave);
      shell.classList.remove("ac-live");
      you.remove();
      for (const el of nodeEls) el.remove();
      for (const p of edgeEls) p.remove();
    };
  }, []);

  return (
    <div ref={rootRef} className="ac-root w-full max-w-130">
      <style>{AC_CSS}</style>
      <div
        className="ac-shell"
        role="img"
        aria-label="A system-design canvas building itself: an AI prompt generates five connected services — Web Client, API Gateway, Shortener Service, Redis Cache and Analytics DB — while two teammates' cursors move across it."
      >
        <div className="ac-grid-glow" />
        <div className="ac-topbar">
          <span className="ac-dot" />
          <span>prompt&nbsp;&rsaquo;&nbsp;</span>
          <span className="ac-prompt" />
          <span className="ac-caret" />
        </div>
        <div className="ac-hint">you&rsquo;re in &mdash; look around</div>
        <div className="ac-board">
          <div className="ac-board-inner">
            <svg className="ac-edges" viewBox="0 0 540 420" aria-hidden="true" />
            <div className="ac-cursor" data-c="1">
              <svg width="16" height="18" viewBox="0 0 16 18" fill="#bf7af0" aria-hidden="true">
                <path d="M0 0l16 6.5-6.6 2.2L6 16z" />
              </svg>
              <span className="ac-tag" style={{ background: "#bf7af0" }}>
                Lyheang
              </span>
            </div>
            <div className="ac-cursor" data-c="2">
              <svg width="16" height="18" viewBox="0 0 16 18" fill="#ff990a" aria-hidden="true">
                <path d="M0 0l16 6.5-6.6 2.2L6 16z" />
              </svg>
              <span className="ac-tag" style={{ background: "#ff990a" }}>
                Leakhena
              </span>
            </div>
          </div>
        </div>
        <div className="ac-status" data-state="done">
          <span className="ac-pulse" />
          <span className="ac-status-text">5 nodes &middot; 4 edges</span>
        </div>
      </div>
    </div>
  );
}

export { AuthCanvas };
