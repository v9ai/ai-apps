import type { CSSProperties } from "react";

interface LogoConcept1Props {
  size?: number;
  className?: string;
}

/**
 * Agentic Healthcare brand mark — concept 1.
 *
 * An EKG heartbeat waveform that morphs into an upward trajectory line.
 * The R-wave spike doubles as the first node of a rising health trend.
 *
 * Colors: indigo (#6366f1) → violet (#818cf8) → teal/cyan (#22d3ee)
 * Animation: double-beat heartbeat pulse, 2.5 s infinite loop.
 *
 * Props:
 *   size      — width & height in px (default 24)
 *   className — additional class names for the <svg> element
 */
export function LogoConcept1({ size = 24, className }: LogoConcept1Props) {
  const nodeKeyframes = `
    @keyframes ahc-heartbeat {
      0%,  100% { opacity: 1;   }
      10%        { opacity: 1;   }
      20%        { opacity: 0.7; }
      30%        { opacity: 1;   }
      45%        { opacity: 0.75; }
      60%, 90%   { opacity: 1;   }
    }
    @keyframes ahc-node-pulse {
      0%,  100% { r: 2.2; }
      15%        { r: 2.7; }
      30%        { r: 2.2; }
      45%        { r: 2.5; }
      60%, 90%   { r: 2.2; }
    }
    @keyframes ahc-glow-pulse {
      0%,  100% { r: 4.5; opacity: 0.35; }
      15%        { r: 6.5; opacity: 0.55; }
      30%        { r: 4.5; opacity: 0.35; }
      45%        { r: 6;   opacity: 0.45; }
      60%, 90%   { r: 4.5; opacity: 0.35; }
    }
  `;

  const ekgStyle: CSSProperties = {
    animation: "ahc-heartbeat 2.5s ease-in-out infinite",
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-label="Agentic Healthcare logo"
      role="img"
    >
      <defs>
        <style>{nodeKeyframes}</style>

        {/* Indigo → violet → teal gradient, oriented along the waveform direction */}
        <linearGradient
          id="ahc-g-line"
          x1="2"
          y1="18"
          x2="30"
          y2="8"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%"   stopColor="#6366f1" />
          <stop offset="55%"  stopColor="#818cf8" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>

        {/* Radial glow behind the peak node */}
        <radialGradient id="ahc-g-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#22d3ee" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0"   />
        </radialGradient>

        {/* Soft blur glow on the entire stroke */}
        <filter id="ahc-f-glow" x="-10%" y="-40%" width="120%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Glow + sharpen for the node dot */}
        <filter id="ahc-f-node" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/*
        EKG segment: flat baseline → Q-dip → R-spike (peak at 11,6) →
        S-trough → J-point → T-wave hump → settle.
        Animated with the heartbeat pulse.
      */}
      <path
        style={ekgStyle}
        d="M 2 20 L 7 20 L 9 22 L 11 6 L 13 22 Q 14.5 26 15.5 18 Q 17 11 18 14 Q 19 17 20 20"
        stroke="url(#ahc-g-line)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#ahc-f-glow)"
      />

      {/*
        Trend line: departs the EKG peak node (11,6) and rises toward
        the top-right, representing longitudinal health improvement.
      */}
      <path
        d="M 11 6 L 18 14 L 24 10 L 30 6"
        stroke="url(#ahc-g-line)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#ahc-f-glow)"
      />

      {/* Secondary trend data-point markers */}
      <circle cx="18" cy="14" r="1.2" fill="#818cf8" opacity="0.7" />
      <circle cx="24" cy="10" r="1.2" fill="#818cf8" opacity="0.7" />
      <circle cx="30" cy="6"  r="1.2" fill="#22d3ee" opacity="0.85" />

      {/*
        Peak node — the visual anchor that connects EKG to trend.
        Three layers: glow halo, glowing dot, bright core.
      */}
      {/* Animated glow halo */}
      <circle
        cx="11"
        cy="6"
        r="4.5"
        fill="url(#ahc-g-glow)"
        style={{ animation: "ahc-glow-pulse 2.5s ease-in-out infinite" }}
      />

      {/* Animated node dot */}
      <circle
        cx="11"
        cy="6"
        r="2.2"
        fill="#22d3ee"
        filter="url(#ahc-f-node)"
        style={{ animation: "ahc-node-pulse 2.5s ease-in-out infinite" }}
      />

      {/* Static bright core */}
      <circle cx="11" cy="6" r="1" fill="white" opacity="0.9" />
    </svg>
  );
}
