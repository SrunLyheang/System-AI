"use client";

import { useEffect, useRef } from "react";

/**
 * Isometric node-graph scene for the sign-in panel. Five depth layers
 * (SVG from Gemini) driven by a single rAF loop: cursor parallax + a slow
 * autonomous drift per layer. Node pulses / connector draw are CSS only.
 * No React state in the animation path.
 */
function AuthHero() {
  const rootRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const desktopQuery = window.matchMedia("(min-width: 1024px)");

    const layers = Array.from(
      root.querySelectorAll<SVGGElement>("[data-parallax]"),
    ).map((el, i) => ({
      el,
      factor: Number(el.dataset.parallax),
      amp: 3 + i * 1.5,
      speed: 0.25 + i * 0.12,
      phase: i * 1.7,
    }));

    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 40;
      targetY = (e.clientY / window.innerHeight - 0.5) * 40;
    };

    const tick = (now: number) => {
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;
      const t = now / 1000;
      for (const l of layers) {
        const x = curX * l.factor + Math.sin(t * l.speed + l.phase) * l.amp;
        const y =
          curY * l.factor + Math.cos(t * l.speed * 0.9 + l.phase) * l.amp;
        l.el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
      }
      raf = requestAnimationFrame(tick);
    };

    const stop = () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const start = () => {
      if (!desktopQuery.matches || raf) return;
      window.addEventListener("pointermove", onMove);
      raf = requestAnimationFrame(tick);
    };

    const onVisibilityChange = () => {
      if (desktopQuery.matches) {
        start();
      } else {
        stop();
      }
    };

    desktopQuery.addEventListener("change", onVisibilityChange);
    start();
    return () => {
      desktopQuery.removeEventListener("change", onVisibilityChange);
      stop();
    };
  }, []);

  return (
    <svg
      ref={rootRef}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-90"
      viewBox="0 0 800 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <style>{`
        .node { animation: node-pulse 4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .node:nth-of-type(3n) { animation-delay: -1.3s; }
        .node:nth-of-type(3n+1) { animation-delay: -2.6s; }
        .pulse-ring { animation: ring-pulse 3.2s ease-out infinite; transform-box: fill-box; transform-origin: center; }
        .pulse-ring:nth-of-type(2) { animation-delay: -1.6s; }
        #layer-edges path { stroke-dasharray: 4 5; animation: dash 3s linear infinite; }
        @keyframes node-pulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
        @keyframes ring-pulse { 0% { transform: scale(.6); opacity: .7; } 100% { transform: scale(1.9); opacity: 0; } }
        @keyframes dash { to { stroke-dashoffset: -18; } }
        @media (prefers-reduced-motion: reduce) {
          .node, .pulse-ring, #layer-edges path { animation: none; }
        }
      `}</style>

      <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="rgba(0,200,212,0.18)" />
        <stop offset="100%" stopColor="rgba(0,200,212,0)" />
      </radialGradient>

      <g id="layer-bg" data-parallax="0.25">
        <g
          opacity="0.12"
          stroke="#2a2a30"
          strokeWidth="1"
          transform="translate(120 560) matrix(0.866,0.5,-0.866,0.5,0,0)"
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 60} x2={360} y2={i * 60} />
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 60} y1={0} x2={i * 60} y2={360} />
          ))}
        </g>

        <g className="card" transform="translate(250, 30)">
          <rect
            width="120"
            height="80"
            rx="6"
            fill="#111114"
            stroke="#2a2a30"
            strokeWidth="1"
            opacity="0.7"
          />
          <rect x="10" y="15" width="90" height="4" rx="2" fill="#2a2a30" />
          <rect x="10" y="30" width="60" height="4" rx="2" fill="#2a2a30" />
          <rect x="10" y="45" width="75" height="4" rx="2" fill="#3a3a42" />
        </g>
        <g
          className="card"
          transform="translate(450, 200) matrix(0.866, 0.5, -0.866, 0.5, 0, 0)"
          opacity="0.6"
        >
          <rect
            width="100"
            height="100"
            rx="8"
            fill="#18181c"
            stroke="#2a2a30"
            strokeWidth="1"
          />
          <circle
            cx="50"
            cy="50"
            r="20"
            fill="none"
            stroke="#2a2a30"
            strokeWidth="2"
          />
          <rect x="25" y="80" width="50" height="4" rx="2" fill="#3a3a42" />
        </g>
        <g
          className="card"
          transform="translate(600, 300) matrix(0.866, 0.5, -0.866, 0.5, 0, 0)"
          opacity="0.4"
        >
          <rect
            width="80"
            height="80"
            rx="6"
            fill="#111114"
            stroke="#2a2a30"
            strokeWidth="1"
          />
          <line
            x1="10"
            y1="15"
            x2="70"
            y2="15"
            stroke="#2a2a30"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect x="10" y="30" width="60" height="4" rx="2" fill="#2a2a30" />
        </g>
      </g>

      <g id="layer-edges" data-parallax="0.5">
        <path
          d="M 340 220 C 380 220, 370 225, 406.7 225"
          fill="none"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
        <path
          d="M 450 220 C 500 220, 500 320, 634.6 320"
          fill="none"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
        <path
          d="M 150 300 C 150 330, 125 320, 125 350"
          fill="none"
          stroke="#00c8d4"
          strokeWidth="1.5"
        />
        <path
          d="M 190 390 C 230 390, 172.1 420, 172.1 465"
          fill="none"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
        <path
          d="M 125 430 C 125 550, 293.3 500, 293.3 675"
          fill="none"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
        <path
          d="M 250 150 C 250 130, 310 140, 310 110"
          fill="none"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
        <path
          d="M 327.9 465 C 327.9 380, 300 380, 300 300"
          fill="none"
          stroke="#00c8d4"
          strokeWidth="1.5"
        />
        <path
          d="M 328 555 C 380 555, 336.6 620, 336.6 700"
          fill="none"
          stroke="#00c8d4"
          strokeWidth="1.5"
        />
        <path
          d="M 406.7 275 C 450 275, 530 220, 530 170"
          fill="none"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
      </g>

      <g id="layer-mid" data-parallax="0.85">
        <g className="card" transform="translate(60, 350)">
          <rect
            width="130"
            height="80"
            rx="8"
            fill="#18181c"
            stroke="#2a2a30"
            strokeWidth="1"
          />
          <rect x="15" y="15" width="100" height="6" rx="3" fill="#3a3a42" />
          <rect x="15" y="35" width="70" height="6" rx="3" fill="#2a2a30" />
          <rect x="15" y="50" width="40" height="6" rx="3" fill="#00c8d4" />
        </g>
        <g
          className="card"
          transform="translate(250, 420) matrix(0.866, 0.5, -0.866, 0.5, 0, 0)"
        >
          <rect
            width="180"
            height="180"
            rx="12"
            fill="#18181c"
            stroke="#2a2a30"
            strokeWidth="1"
          />
          <line
            x1="20"
            y1="30"
            x2="160"
            y2="30"
            stroke="#2a2a30"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect x="20" y="55" width="100" height="5" rx="2.5" fill="#3a3a42" />
          <rect x="20" y="75" width="140" height="5" rx="2.5" fill="#2a2a30" />
          <rect x="20" y="95" width="120" height="5" rx="2.5" fill="#2a2a30" />
          <rect
            x="20"
            y="130"
            width="50"
            height="30"
            rx="6"
            fill="#111114"
            stroke="#3a3a42"
            strokeWidth="1"
          />
          <rect
            x="80"
            y="130"
            width="80"
            height="30"
            rx="6"
            fill="#111114"
            stroke="#3a3a42"
            strokeWidth="1"
          />
        </g>
      </g>

      <g id="layer-nodes" data-parallax="1.1">
        <circle
          className="node"
          cx="250"
          cy="150"
          r="3.5"
          fill="#111114"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
        <circle className="node" cx="150" cy="300" r="4.5" fill="#00c8d4" />
        <circle
          className="node"
          cx="300"
          cy="300"
          r="4"
          fill="#18181c"
          stroke="#00c8d4"
          strokeWidth="1.5"
        />
        <circle className="node" cx="336.6" cy="700" r="5" fill="#6457f9" />
        <circle
          className="pulse-ring"
          cx="336.6"
          cy="700"
          r="14"
          fill="none"
          stroke="#6457f9"
          strokeWidth="1.5"
          opacity="0.6"
        />
        <circle
          className="node"
          cx="336.6"
          cy="800"
          r="3.5"
          fill="#111114"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
        <circle
          className="node"
          cx="293.3"
          cy="675"
          r="4"
          fill="#111114"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
        <circle className="node" cx="328" cy="555" r="4.5" fill="#00c8d4" />
        <circle
          className="pulse-ring"
          cx="328"
          cy="555"
          r="11"
          fill="none"
          stroke="#00c8d4"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <circle
          className="node"
          cx="327.9"
          cy="465"
          r="4"
          fill="#111114"
          stroke="#00c8d4"
          strokeWidth="1.5"
        />
        <circle
          className="node"
          cx="172.1"
          cy="465"
          r="3.5"
          fill="#111114"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
        <circle className="node" cx="380" cy="170" r="4.5" fill="#00c8d4" />
        <circle
          className="node"
          cx="450"
          cy="220"
          r="3.5"
          fill="#111114"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
        <circle
          className="node"
          cx="530"
          cy="170"
          r="3.5"
          fill="#18181c"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
        <circle
          className="node"
          cx="190"
          cy="390"
          r="3.5"
          fill="#111114"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
        <circle className="node" cx="125" cy="350" r="4" fill="#00c8d4" />
        <circle
          className="node"
          cx="125"
          cy="430"
          r="3.5"
          fill="#18181c"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
        <circle
          className="node"
          cx="310"
          cy="110"
          r="3"
          fill="#111114"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
        <circle
          className="node"
          cx="406.7"
          cy="225"
          r="3"
          fill="#111114"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
        <circle
          className="node"
          cx="406.7"
          cy="275"
          r="3"
          fill="#111114"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
        <circle
          className="node"
          cx="634.6"
          cy="320"
          r="3"
          fill="#18181c"
          stroke="#3a3a42"
          strokeWidth="1.5"
        />
      </g>

      <g id="layer-front" data-parallax="1.7">
        <ellipse cx="220" cy="225" rx="230" ry="180" fill="url(#hero-glow)" />
        <g className="card" transform="translate(100, 150)">
          <rect
            width="240"
            height="150"
            rx="12"
            fill="#18181c"
            stroke="#6457f9"
            strokeWidth="1.5"
          />
          <line
            x1="12"
            y1="0"
            x2="62"
            y2="0"
            stroke="#f0f0f4"
            strokeWidth="1.5"
            opacity="0.3"
          />
          <line
            x1="20"
            y1="24"
            x2="220"
            y2="24"
            stroke="#2a2a30"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <rect
            x="20"
            y="45"
            width="140"
            height="6"
            rx="3"
            fill="#6457f9"
            opacity="0.8"
          />
          <rect x="20" y="65" width="200" height="6" rx="3" fill="#3a3a42" />
          <rect x="20" y="85" width="170" height="6" rx="3" fill="#2a2a30" />
          <rect x="20" y="105" width="90" height="6" rx="3" fill="#2a2a30" />
        </g>
        <g
          className="card"
          transform="translate(250, 650) matrix(0.866, 0.5, -0.866, 0.5, 0, 0)"
        >
          <rect
            width="200"
            height="200"
            rx="16"
            fill="#111114"
            stroke="#2a2a30"
            strokeWidth="1"
          />
          <line
            x1="20"
            y1="0"
            x2="80"
            y2="0"
            stroke="#f0f0f4"
            strokeWidth="1"
            opacity="0.2"
          />
          <rect
            x="15"
            y="15"
            width="170"
            height="40"
            rx="8"
            fill="#18181c"
            stroke="#2a2a30"
            strokeWidth="1"
          />
          <rect
            x="30"
            y="32"
            width="80"
            height="6"
            rx="3"
            fill="#00c8d4"
            opacity="0.9"
          />
          <rect
            x="15"
            y="70"
            width="170"
            height="115"
            rx="8"
            fill="#18181c"
            stroke="#2a2a30"
            strokeWidth="1"
          />
          <circle
            cx="100"
            cy="127"
            r="30"
            fill="none"
            stroke="#3a3a42"
            strokeWidth="2"
          />
          <circle
            cx="100"
            cy="127"
            r="15"
            fill="none"
            stroke="#00c8d4"
            strokeWidth="2"
          />
          <line
            x1="100"
            y1="97"
            x2="100"
            y2="107"
            stroke="#3a3a42"
            strokeWidth="2"
          />
          <line
            x1="100"
            y1="147"
            x2="100"
            y2="157"
            stroke="#3a3a42"
            strokeWidth="2"
          />
          <line
            x1="70"
            y1="127"
            x2="80"
            y2="127"
            stroke="#3a3a42"
            strokeWidth="2"
          />
          <line
            x1="120"
            y1="127"
            x2="130"
            y2="127"
            stroke="#3a3a42"
            strokeWidth="2"
          />
        </g>
      </g>
    </svg>
  );
}

export { AuthHero };
