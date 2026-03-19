interface AgenticHealthcareLogoProps {
  size?: number;
  className?: string;
}

/**
 * Agentic Healthcare logo — concept 5.
 *
 * Visual narrative: a DNA double-helix in the lower half "unfurls" into two
 * diverging trend lines that rise toward glowing terminal nodes, reading as
 * biology → data → insight.
 *
 * Gradient: cyan (#22d3ee) at the base, indigo (#6366f1) at the apex.
 * Animation: a staged "rise" effect where each section of the path reveals
 * itself from bottom to top over 3 s, then repeats.
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
      aria-label="Agentic Healthcare"
      className={className}
    >
      <defs>
        {/* Main gradient: cyan at bottom, indigo at top */}
        <linearGradient
          id="lc5-g-rise"
          x1="16"
          y1="30"
          x2="16"
          y2="2"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="55%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>

        {/* Slightly brighter gradient for the second strand */}
        <linearGradient
          id="lc5-g-rise-2"
          x1="16"
          y1="30"
          x2="16"
          y2="2"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="55%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>

        {/* Glow filter for the terminal nodes */}
        <filter
          id="lc5-glow-node"
          x="-150%"
          y="-150%"
          width="400%"
          height="400%"
        >
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Subtle glow on the strands */}
        <filter
          id="lc5-glow-strand"
          x="-30%"
          y="-10%"
          width="160%"
          height="120%"
        >
          <feGaussianBlur stdDeviation="0.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Cross-bar connector gradient */}
        <linearGradient id="lc5-g-cross" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.5" />
        </linearGradient>

        <clipPath id="lc5-clip-box">
          <rect width="32" height="32" />
        </clipPath>
      </defs>

      <g clipPath="url(#lc5-clip-box)">
        {/* ─── Helix cross-bar rungs ─── */}
        <g
          stroke="url(#lc5-g-cross)"
          strokeWidth="0.7"
          strokeLinecap="round"
          opacity="0.55"
        >
          <line x1="13.5" y1="29.8" x2="18.5" y2="29.8" />
          <line x1="13.2" y1="25.0" x2="18.8" y2="25.0" />
          <line x1="13.5" y1="20.0" x2="18.5" y2="20.0" />
          <line x1="13.8" y1="15.2" x2="18.2" y2="15.2" />
        </g>

        {/* ─── Strand B (back strand, phase-shifted) ─── */}
        <path
          d="M 18.5 30
             C 20.5 28.5, 20.5 26.0, 16.0 27.2
             C 11.5 28.4, 11.5 25.5, 13.2 25.0
             C 14.8 24.5, 20.8 23.0, 18.8 22.4
             C 16.8 21.8, 11.2 21.0, 13.5 20.0
             C 15.2 19.2, 20.5 17.8, 18.5 17.6
             C 16.5 17.4, 11.5 16.5, 13.8 15.2
             C 15.5 14.2, 18.5 14.0, 18.5 14.0"
          stroke="url(#lc5-g-rise-2)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#lc5-glow-strand)"
          opacity="0.75"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="120"
            to="0"
            dur="3s"
            begin="0s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
          <animate
            attributeName="stroke-dasharray"
            from="0 120"
            to="120 120"
            dur="3s"
            begin="0s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
        </path>

        {/* ─── Strand A (front strand) ─── */}
        <path
          d="M 13.5 30
             C 11.5 28.5, 11.5 26.0, 16.0 27.2
             C 20.5 28.4, 20.5 25.5, 18.8 25.0
             C 17.2 24.5, 11.2 23.0, 13.2 22.4
             C 15.2 21.8, 20.8 21.0, 18.5 20.0
             C 16.8 19.2, 11.5 17.8, 13.5 17.6
             C 15.5 17.4, 20.5 16.5, 18.2 15.2
             C 16.5 14.2, 13.5 14.0, 13.5 14.0"
          stroke="url(#lc5-g-rise)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#lc5-glow-strand)"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="120"
            to="0"
            dur="3s"
            begin="0s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
          <animate
            attributeName="stroke-dasharray"
            from="0 120"
            to="120 120"
            dur="3s"
            begin="0s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
        </path>

        {/* ─── Left unfurl arm ─── */}
        <path
          d="M 13.5 14.0
             C 13.0 12.5, 11.5 11.5, 10.5 10.0"
          stroke="url(#lc5-g-rise)"
          strokeWidth="1.8"
          strokeLinecap="round"
          filter="url(#lc5-glow-strand)"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="30"
            to="0"
            dur="3s"
            begin="0.6s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
          <animate
            attributeName="stroke-dasharray"
            from="0 30"
            to="30 30"
            dur="3s"
            begin="0.6s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
        </path>

        {/* ─── Right unfurl arm ─── */}
        <path
          d="M 18.5 14.0
             C 19.0 12.5, 20.5 11.5, 21.5 10.0"
          stroke="url(#lc5-g-rise-2)"
          strokeWidth="1.5"
          strokeLinecap="round"
          filter="url(#lc5-glow-strand)"
          opacity="0.85"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="30"
            to="0"
            dur="3s"
            begin="0.6s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
          <animate
            attributeName="stroke-dasharray"
            from="0 30"
            to="30 30"
            dur="3s"
            begin="0.6s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
        </path>

        {/* ─── Left trend line ─── */}
        <path
          d="M 10.5 10.0
             C 9.8 8.5, 9.2 7.2, 8.5 6.0
             C 7.8 4.8, 7.2 4.0, 7.0 3.0"
          stroke="url(#lc5-g-rise)"
          strokeWidth="1.8"
          strokeLinecap="round"
          filter="url(#lc5-glow-strand)"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="40"
            to="0"
            dur="3s"
            begin="1.1s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
          <animate
            attributeName="stroke-dasharray"
            from="0 40"
            to="40 40"
            dur="3s"
            begin="1.1s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
        </path>

        {/* ─── Right trend line (steeper breakout) ─── */}
        <path
          d="M 21.5 10.0
             C 22.2 8.2, 23.0 6.5, 23.5 5.0
             C 24.0 3.5, 24.5 2.8, 25.0 2.0"
          stroke="url(#lc5-g-rise-2)"
          strokeWidth="1.5"
          strokeLinecap="round"
          filter="url(#lc5-glow-strand)"
          opacity="0.85"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="40"
            to="0"
            dur="3s"
            begin="1.1s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
          <animate
            attributeName="stroke-dasharray"
            from="0 40"
            to="40 40"
            dur="3s"
            begin="1.1s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
        </path>

        {/* ─── Left terminal node (indigo) ─── */}
        <circle
          cx="7.0"
          cy="3.0"
          r="2.4"
          fill="#6366f1"
          opacity="0.18"
          filter="url(#lc5-glow-node)"
        >
          <animate
            attributeName="opacity"
            values="0;0.18"
            dur="3s"
            begin="1.8s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
        </circle>
        <circle
          cx="7.0"
          cy="3.0"
          r="1.4"
          fill="#6366f1"
          filter="url(#lc5-glow-node)"
        >
          <animate
            attributeName="opacity"
            values="0;1"
            dur="3s"
            begin="1.8s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
          <animate
            attributeName="r"
            values="0.4;1.4"
            dur="3s"
            begin="1.8s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
        </circle>

        {/* ─── Right terminal node (indigo-violet) ─── */}
        <circle
          cx="25.0"
          cy="2.0"
          r="2.8"
          fill="#818cf8"
          opacity="0.18"
          filter="url(#lc5-glow-node)"
        >
          <animate
            attributeName="opacity"
            values="0;0.22"
            dur="3s"
            begin="1.9s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
        </circle>
        <circle
          cx="25.0"
          cy="2.0"
          r="1.6"
          fill="#818cf8"
          filter="url(#lc5-glow-node)"
        >
          <animate
            attributeName="opacity"
            values="0;1"
            dur="3s"
            begin="1.9s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
          <animate
            attributeName="r"
            values="0.4;1.6"
            dur="3s"
            begin="1.9s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1"
          />
        </circle>
      </g>
    </svg>
  );
}
