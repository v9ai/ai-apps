interface AgenticHealthcareLogoProps {
  size?: number;
  className?: string;
}

/**
 * Agentic Healthcare — brand mark (concept 2).
 *
 * A molecular graph cell: six nodes on a regular hexagon connected by
 * rim edges and diagonal spokes, with a filled hexagonal core housing
 * a tiny bar chart (longitudinal health data). The top node pulses as
 * a repeating "ping" on a 3 s cycle — representing AI autonomy and
 * continuous monitoring.
 *
 * Colours: indigo #6366f1 (primary) / violet #8b5cf6 (secondary).
 * Works on dark backgrounds; icon-only, no text.
 * viewBox 0 0 32 32 — crisp from 20 px to 128 px.
 */
export function AgenticHealthcareLogo({
  size = 24,
  className,
}: AgenticHealthcareLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label="Agentic Healthcare logo"
      className={className}
    >
      <defs>
        {/* ── Gradients ── */}
        <radialGradient id="ahc2-cellGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="ahc2-cellFill" cx="38%" cy="36%" r="62%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="55%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </radialGradient>

        <linearGradient id="ahc2-rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>

        <radialGradient id="ahc2-nodeFill" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#e0e7ff" />
          <stop offset="100%" stopColor="#818cf8" />
        </radialGradient>

        <radialGradient id="ahc2-pingFill" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#a5b4fc" />
        </radialGradient>

        <linearGradient
          id="ahc2-barGrad"
          x1="0%"
          y1="100%"
          x2="0%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.9" />
        </linearGradient>

        {/* ── Filters ── */}
        <filter id="ahc2-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation="1.2"
            result="blur"
          />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <filter
          id="ahc2-pingGlow"
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" />
        </filter>

        <filter
          id="ahc2-edgeBlur"
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" />
        </filter>
      </defs>

      {/* ── Ambient background glow ── */}
      <circle cx="16" cy="16" r="14" fill="url(#ahc2-cellGlow)" />

      {/*
       * Six nodes on a regular hexagon, r = 10.5, centred at 16 16.
       * Angles from top, clockwise: 90°, 30°, 330°, 270°, 210°, 150°.
       * Coords: N0(16,5.5) N1(25.09,10.75) N2(25.09,21.25)
       *         N3(16,26.5) N4(6.91,21.25) N5(6.91,10.75)
       */}

      {/* ── Rim edges ── */}
      <g
        stroke="#6366f1"
        strokeOpacity="0.45"
        strokeWidth="0.9"
        filter="url(#ahc2-edgeBlur)"
      >
        <line x1="16" y1="5.5" x2="25.09" y2="10.75" />
        <line x1="25.09" y1="10.75" x2="25.09" y2="21.25" />
        <line x1="25.09" y1="21.25" x2="16" y2="26.5" />
        <line x1="16" y1="26.5" x2="6.91" y2="21.25" />
        <line x1="6.91" y1="21.25" x2="6.91" y2="10.75" />
        <line x1="6.91" y1="10.75" x2="16" y2="5.5" />
      </g>

      {/* ── Diagonal spokes ── */}
      <g
        stroke="#8b5cf6"
        strokeOpacity="0.35"
        strokeWidth="0.75"
        filter="url(#ahc2-edgeBlur)"
      >
        <line x1="16" y1="5.5" x2="16" y2="26.5" />
        <line x1="25.09" y1="10.75" x2="6.91" y2="21.25" />
        <line x1="25.09" y1="21.25" x2="6.91" y2="10.75" />
      </g>

      {/*
       * Inner hex cell body, r = 6.8.
       * Vertices: (16,9.2) (21.89,12.6) (21.89,19.4)
       *           (16,22.8) (10.11,19.4) (10.11,12.6)
       */}
      <polygon
        points="16,9.2 21.89,12.6 21.89,19.4 16,22.8 10.11,19.4 10.11,12.6"
        fill="url(#ahc2-cellFill)"
        stroke="url(#ahc2-rimGrad)"
        strokeWidth="0.7"
        strokeLinejoin="round"
        filter="url(#ahc2-glow)"
      />

      {/* ── Inner bar chart ── */}
      {/* left bar */}
      <rect
        x="12.35"
        y="16.0"
        width="1.3"
        height="4.4"
        rx="0.55"
        fill="url(#ahc2-barGrad)"
        fillOpacity="0.88"
      />
      {/* center bar (tallest) */}
      <rect
        x="14.95"
        y="13.8"
        width="1.3"
        height="6.6"
        rx="0.55"
        fill="#e0e7ff"
        fillOpacity="0.95"
      />
      {/* right bar */}
      <rect
        x="17.55"
        y="17.1"
        width="1.3"
        height="3.3"
        rx="0.55"
        fill="url(#ahc2-barGrad)"
        fillOpacity="0.75"
      />

      {/* ── N0 — top node (ping animation) ── */}
      {/* aura ring (blurred) */}
      <circle
        cx="16"
        cy="5.5"
        r="3.2"
        fill="#818cf8"
        fillOpacity="0"
        filter="url(#ahc2-pingGlow)"
      >
        <animate
          attributeName="r"
          values="3.2;5.4;3.2"
          dur="3s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
        />
        <animate
          attributeName="fill-opacity"
          values="0;0.55;0"
          dur="3s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
        />
      </circle>
      {/* expanding stroke ring */}
      <circle
        cx="16"
        cy="5.5"
        r="2.0"
        fill="none"
        stroke="#a5b4fc"
        strokeWidth="0.55"
        strokeOpacity="0"
      >
        <animate
          attributeName="r"
          values="2.0;3.6;2.0"
          dur="3s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
        />
        <animate
          attributeName="stroke-opacity"
          values="0.9;0;0.9"
          dur="3s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
        />
      </circle>
      {/* solid ping node core */}
      <circle
        cx="16"
        cy="5.5"
        r="1.9"
        fill="url(#ahc2-pingFill)"
        stroke="#c7d2fe"
        strokeWidth="0.4"
      />

      {/* ── N1–N5 — static nodes ── */}
      <circle
        cx="25.09"
        cy="10.75"
        r="1.6"
        fill="url(#ahc2-nodeFill)"
        stroke="#818cf8"
        strokeWidth="0.35"
      />
      <circle
        cx="25.09"
        cy="21.25"
        r="1.6"
        fill="url(#ahc2-nodeFill)"
        stroke="#818cf8"
        strokeWidth="0.35"
      />
      <circle
        cx="16"
        cy="26.5"
        r="1.6"
        fill="url(#ahc2-nodeFill)"
        stroke="#818cf8"
        strokeWidth="0.35"
      />
      <circle
        cx="6.91"
        cy="21.25"
        r="1.6"
        fill="url(#ahc2-nodeFill)"
        stroke="#818cf8"
        strokeWidth="0.35"
      />
      <circle
        cx="6.91"
        cy="10.75"
        r="1.6"
        fill="url(#ahc2-nodeFill)"
        stroke="#818cf8"
        strokeWidth="0.35"
      />

      {/* ── Centre AI core ── */}
      <circle
        cx="16"
        cy="16"
        r="1.35"
        fill="#e0e7ff"
        fillOpacity="0.9"
        stroke="#c7d2fe"
        strokeWidth="0.3"
      />
    </svg>
  );
}
