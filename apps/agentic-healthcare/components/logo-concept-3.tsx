interface LogoConcept3Props {
  size?: number;
  className?: string;
}

/**
 * Agentic Healthcare logo — concept 3.
 *
 * A rounded medical cross with animated circuit / neural-network
 * trace lines radiating outward, an indigo-filled body, and a
 * pulsing AI-eye at the center.
 *
 * viewBox 0 0 32 32 → works cleanly at 20 px – 128 px.
 * Designed for dark backgrounds (dark-theme first).
 */
export function LogoConcept3({ size = 24, className }: LogoConcept3Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label="Agentic Healthcare"
      className={className}
    >
      <defs>
        {/* Indigo glow filter for the cross body */}
        <filter id="ahc3-glow-core" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Soft outer glow for the cross */}
        <filter id="ahc3-glow-outer" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Radial gradient: indigo core for the cross fill */}
        <radialGradient id="ahc3-cross-fill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="55%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </radialGradient>

        {/* Sheen on top face of the cross */}
        <linearGradient
          id="ahc3-cross-sheen"
          x1="0%"
          y1="0%"
          x2="60%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.18} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </linearGradient>

        {/* Horizontal circuit-trace gradient */}
        <linearGradient id="ahc3-trace-h" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0} />
          <stop offset="40%" stopColor="#3b82f6" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.6} />
        </linearGradient>

        {/* Vertical circuit-trace gradient */}
        <linearGradient id="ahc3-trace-v" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0} />
          <stop offset="40%" stopColor="#3b82f6" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.6} />
        </linearGradient>

        {/* Diagonal neural-trace gradient */}
        <linearGradient
          id="ahc3-trace-diag"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#818cf8" stopOpacity={0} />
          <stop offset="50%" stopColor="#818cf8" stopOpacity={0.8} />
          <stop offset="100%" stopColor="#818cf8" stopOpacity={0.2} />
        </linearGradient>

        <clipPath id="ahc3-canvas-clip">
          <rect width="32" height="32" />
        </clipPath>
      </defs>

      <g clipPath="url(#ahc3-canvas-clip)">
        {/* ─────────────────────────────────────────
            LAYER 1 — Circuit board trace lines
            Rendered beneath the cross
            ───────────────────────────────────────── */}

        {/* Left arm → left edge */}
        <line
          x1="11"
          y1="16"
          x2="2"
          y2="16"
          stroke="url(#ahc3-trace-h)"
          strokeWidth={0.7}
          strokeLinecap="round"
        >
          <animate
            attributeName="stroke-dasharray"
            from="0 14"
            to="14 0"
            dur="4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-dashoffset"
            from="14"
            to="0"
            dur="4s"
            repeatCount="indefinite"
          />
        </line>

        {/* 90° bend downward from left trace end */}
        <polyline
          points="2,16 2,22"
          stroke="#3b82f6"
          strokeWidth={0.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.7}
        >
          <animate
            attributeName="stroke-dasharray"
            from="0 6"
            to="6 0"
            dur="4s"
            begin="0.3s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-dashoffset"
            from="6"
            to="0"
            dur="4s"
            begin="0.3s"
            repeatCount="indefinite"
          />
        </polyline>

        {/* Right arm → right edge with downward bend */}
        <polyline
          points="21,16 30,16 30,22"
          stroke="#3b82f6"
          strokeWidth={0.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.8}
        >
          <animate
            attributeName="stroke-dasharray"
            from="0 20"
            to="20 0"
            dur="4s"
            begin="0.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-dashoffset"
            from="20"
            to="0"
            dur="4s"
            begin="0.5s"
            repeatCount="indefinite"
          />
        </polyline>

        {/* Top arm → up, then left */}
        <polyline
          points="16,11 16,4 10,4"
          stroke="#818cf8"
          strokeWidth={0.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.75}
        >
          <animate
            attributeName="stroke-dasharray"
            from="0 18"
            to="18 0"
            dur="4s"
            begin="0.8s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-dashoffset"
            from="18"
            to="0"
            dur="4s"
            begin="0.8s"
            repeatCount="indefinite"
          />
        </polyline>

        {/* Bottom arm → down, then right */}
        <polyline
          points="16,21 16,28 22,28"
          stroke="#818cf8"
          strokeWidth={0.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.75}
        >
          <animate
            attributeName="stroke-dasharray"
            from="0 18"
            to="18 0"
            dur="4s"
            begin="1.1s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-dashoffset"
            from="18"
            to="0"
            dur="4s"
            begin="1.1s"
            repeatCount="indefinite"
          />
        </polyline>

        {/* Diagonal neural trace — top-left quadrant */}
        <line
          x1="4"
          y1="6"
          x2="10"
          y2="11"
          stroke="#818cf8"
          strokeWidth={0.55}
          strokeLinecap="round"
          strokeOpacity={0.5}
        >
          <animate
            attributeName="stroke-dasharray"
            from="0 10"
            to="10 0"
            dur="4s"
            begin="1.4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-dashoffset"
            from="10"
            to="0"
            dur="4s"
            begin="1.4s"
            repeatCount="indefinite"
          />
        </line>

        {/* Diagonal neural trace — bottom-right quadrant */}
        <line
          x1="22"
          y1="21"
          x2="28"
          y2="27"
          stroke="#818cf8"
          strokeWidth={0.55}
          strokeLinecap="round"
          strokeOpacity={0.5}
        >
          <animate
            attributeName="stroke-dasharray"
            from="0 10"
            to="10 0"
            dur="4s"
            begin="1.6s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-dashoffset"
            from="10"
            to="0"
            dur="4s"
            begin="1.6s"
            repeatCount="indefinite"
          />
        </line>

        {/* Short horizontal stub — top-right area */}
        <line
          x1="22"
          y1="7"
          x2="28"
          y2="7"
          stroke="#3b82f6"
          strokeWidth={0.6}
          strokeLinecap="round"
          strokeOpacity={0.55}
        >
          <animate
            attributeName="stroke-dasharray"
            from="0 6"
            to="6 0"
            dur="4s"
            begin="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-dashoffset"
            from="6"
            to="0"
            dur="4s"
            begin="2s"
            repeatCount="indefinite"
          />
        </line>

        {/* Vertical stub descending from top-right horizontal */}
        <line
          x1="28"
          y1="7"
          x2="28"
          y2="12"
          stroke="#3b82f6"
          strokeWidth={0.6}
          strokeLinecap="round"
          strokeOpacity={0.4}
        >
          <animate
            attributeName="stroke-dasharray"
            from="0 5"
            to="5 0"
            dur="4s"
            begin="2.3s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-dashoffset"
            from="5"
            to="0"
            dur="4s"
            begin="2.3s"
            repeatCount="indefinite"
          />
        </line>

        {/* ─────────────────────────────────────────
            LAYER 2 — Terminal / pad nodes
            ───────────────────────────────────────── */}

        <circle cx="2" cy="22" r="1.1" fill="#3b82f6" fillOpacity={0.85}>
          <animate
            attributeName="fillOpacity"
            values="0.85;0.4;0.85"
            dur="4s"
            begin="0.3s"
            repeatCount="indefinite"
          />
        </circle>

        <circle cx="30" cy="22" r="1.1" fill="#3b82f6" fillOpacity={0.85}>
          <animate
            attributeName="fillOpacity"
            values="0.85;0.4;0.85"
            dur="4s"
            begin="0.5s"
            repeatCount="indefinite"
          />
        </circle>

        <circle cx="10" cy="4" r="1.1" fill="#818cf8" fillOpacity={0.8}>
          <animate
            attributeName="fillOpacity"
            values="0.8;0.35;0.8"
            dur="4s"
            begin="0.8s"
            repeatCount="indefinite"
          />
        </circle>

        <circle cx="22" cy="28" r="1.1" fill="#818cf8" fillOpacity={0.8}>
          <animate
            attributeName="fillOpacity"
            values="0.8;0.35;0.8"
            dur="4s"
            begin="1.1s"
            repeatCount="indefinite"
          />
        </circle>

        <circle cx="4" cy="6" r="0.9" fill="#818cf8" fillOpacity={0.6}>
          <animate
            attributeName="fillOpacity"
            values="0.6;0.2;0.6"
            dur="4s"
            begin="1.4s"
            repeatCount="indefinite"
          />
        </circle>

        <circle cx="28" cy="27" r="0.9" fill="#818cf8" fillOpacity={0.6}>
          <animate
            attributeName="fillOpacity"
            values="0.6;0.2;0.6"
            dur="4s"
            begin="1.6s"
            repeatCount="indefinite"
          />
        </circle>

        <circle cx="22" cy="7" r="0.9" fill="#3b82f6" fillOpacity={0.55}>
          <animate
            attributeName="fillOpacity"
            values="0.55;0.2;0.55"
            dur="4s"
            begin="2s"
            repeatCount="indefinite"
          />
        </circle>

        <circle cx="28" cy="12" r="0.9" fill="#3b82f6" fillOpacity={0.5}>
          <animate
            attributeName="fillOpacity"
            values="0.5;0.15;0.5"
            dur="4s"
            begin="2.3s"
            repeatCount="indefinite"
          />
        </circle>

        {/* ─────────────────────────────────────────
            LAYER 3 — Medical cross (indigo, rounded)

            Convex outer corners ≈ r 2, concave inner
            corners ≈ r 1.5 for a soft modern look.
            ───────────────────────────────────────── */}
        <path
          d={`
            M 15 10
            Q 16 10 17 10
            Q 19 10 19 12
            L 19 13
            Q 19 14.5 20.5 14.5
            L 22 14.5
            Q 22 14.5 22 16
            Q 22 17.5 22 17.5
            L 20.5 17.5
            Q 19 17.5 19 19
            L 19 20
            Q 19 22 17 22
            Q 16 22 15 22
            Q 13 22 13 20
            L 13 19
            Q 13 17.5 11.5 17.5
            L 10 17.5
            Q 10 17.5 10 16
            Q 10 14.5 10 14.5
            L 11.5 14.5
            Q 13 14.5 13 13
            L 13 12
            Q 13 10 15 10
            Z
          `}
          fill="url(#ahc3-cross-fill)"
          filter="url(#ahc3-glow-outer)"
        >
          <animate
            attributeName="opacity"
            values="1;0.88;1"
            dur="3s"
            repeatCount="indefinite"
          />
        </path>

        {/* Sheen overlay — gives the cross a subtle 3-D depth */}
        <path
          d={`
            M 15 10
            Q 16 10 17 10
            Q 19 10 19 12
            L 19 13
            Q 19 14.5 20.5 14.5
            L 22 14.5
            Q 22 14.5 22 16
            Q 22 17.5 22 17.5
            L 20.5 17.5
            Q 19 17.5 19 19
            L 19 20
            Q 19 22 17 22
            Q 16 22 15 22
            Q 13 22 13 20
            L 13 19
            Q 13 17.5 11.5 17.5
            L 10 17.5
            Q 10 17.5 10 16
            Q 10 14.5 10 14.5
            L 11.5 14.5
            Q 13 14.5 13 13
            L 13 12
            Q 13 10 15 10
            Z
          `}
          fill="url(#ahc3-cross-sheen)"
        />

        {/* ─────────────────────────────────────────
            LAYER 4 — Center AI core / pulse eye
            ───────────────────────────────────────── */}

        {/* Outer glowing ring */}
        <circle
          cx="16"
          cy="16"
          r="2.8"
          fill="#4f46e5"
          filter="url(#ahc3-glow-core)"
        >
          <animate
            attributeName="r"
            values="2.8;3.2;2.8"
            dur="3s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="fillOpacity"
            values="1;0.7;1"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Inner bright dot */}
        <circle cx="16" cy="16" r="1.4" fill="#a5b4fc">
          <animate
            attributeName="r"
            values="1.4;1.7;1.4"
            dur="3s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="fillOpacity"
            values="1;0.6;1"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Specular highlight — top-left of centre dot */}
        <circle cx="15.2" cy="15.2" r="0.45" fill="#ffffff" fillOpacity={0.7} />
      </g>
    </svg>
  );
}
