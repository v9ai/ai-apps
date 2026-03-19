interface AgenticHealthcareLogoProps {
  size?: number;
  className?: string;
}

/**
 * Agentic Healthcare logo — concept 4.
 *
 * Shield / badge shape containing an ECG waveform.
 * The waveform features a left-to-right shimmer sweep animation (3 s, infinite).
 *
 * Works on dark backgrounds. Indigo (#6366f1) primary accent.
 * Crisp at 20 px → 128 px.
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
      role="img"
      className={className}
    >
      <defs>
        {/* Shield body gradient: deep navy-indigo, lighter toward center */}
        <radialGradient
          id="ahShieldFill"
          cx="50%"
          cy="42%"
          r="58%"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#2d2a6e" />
          <stop offset="100%" stopColor="#0f0d2a" />
        </radialGradient>

        {/* Shield edge glow — top bright, bottom fades */}
        <linearGradient
          id="ahShieldStroke"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor="#818cf8" stopOpacity={0.9} />
          <stop offset="50%" stopColor="#6366f1" stopOpacity={0.7} />
          <stop offset="100%" stopColor="#4338ca" stopOpacity={0.4} />
        </linearGradient>

        {/* Waveform gradient: transparent tips, bright indigo-white center */}
        <linearGradient
          id="ahWaveGrad"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#6366f1" stopOpacity={0} />
          <stop offset="18%" stopColor="#6366f1" stopOpacity={0.5} />
          <stop offset="50%" stopColor="#a5b4fc" stopOpacity={1} />
          <stop offset="82%" stopColor="#6366f1" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
        </linearGradient>

        {/* Shimmer sweep — bright white band */}
        <linearGradient
          id="ahShimmer"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="white" stopOpacity={0} />
          <stop offset="40%" stopColor="white" stopOpacity={0} />
          <stop offset="50%" stopColor="white" stopOpacity={0.55} />
          <stop offset="60%" stopColor="white" stopOpacity={0} />
          <stop offset="100%" stopColor="white" stopOpacity={0} />
        </linearGradient>

        {/* Glow blur for the waveform */}
        <filter
          id="ahWaveGlow"
          x="-30%"
          y="-80%"
          width="160%"
          height="260%"
        >
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation="0.7"
            result="blur"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Indigo drop shadow under the shield */}
        <filter
          id="ahShieldShadow"
          x="-15%"
          y="-10%"
          width="130%"
          height="130%"
        >
          <feDropShadow
            dx="0"
            dy="1"
            stdDeviation="2"
            floodColor="#6366f1"
            floodOpacity={0.35}
          />
        </filter>

        {/* Clip everything inside to the shield shape */}
        <clipPath id="ahShieldClip">
          <path d="M16 2.5 L27.5 7.5 L27.5 17.5 Q27.5 25.5 16 30 Q4.5 25.5 4.5 17.5 L4.5 7.5 Z" />
        </clipPath>
      </defs>

      {/* ── Shield body ── */}
      <path
        d="M16 2.5 L27.5 7.5 L27.5 17.5 Q27.5 25.5 16 30 Q4.5 25.5 4.5 17.5 L4.5 7.5 Z"
        fill="url(#ahShieldFill)"
        filter="url(#ahShieldShadow)"
      />

      {/* Shield border */}
      <path
        d="M16 2.5 L27.5 7.5 L27.5 17.5 Q27.5 25.5 16 30 Q4.5 25.5 4.5 17.5 L4.5 7.5 Z"
        fill="none"
        stroke="url(#ahShieldStroke)"
        strokeWidth={0.85}
        strokeLinejoin="round"
      />

      {/* ── Waveform + shimmer, clipped to shield ── */}
      <g clipPath="url(#ahShieldClip)" filter="url(#ahWaveGlow)">
        {/* Primary ECG waveform */}
        <path
          d="M5.5 16.5
             L8.5 16.5
             L9.5 19.5
             L10.5 13.5
             L11.5 20.5
             L12.5 16.5
             L14 16.5
             L14.5 14.5
             L15 11
             L15.5 23
             L16 14
             L16.5 16.5
             L18 16.5
             L18.5 19
             L19.5 14
             L20.5 16.5
             L26.5 16.5"
          stroke="url(#ahWaveGrad)"
          strokeWidth={1.35}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Echo / shadow line */}
        <path
          d="M5.5 17
             L8.5 17
             L9.5 20
             L10.5 14
             L11.5 21
             L12.5 17
             L14 17
             L14.5 15
             L15 11.5
             L15.5 23.5
             L16 14.5
             L16.5 17
             L18 17
             L18.5 19.5
             L19.5 14.5
             L20.5 17
             L26.5 17"
          stroke="#6366f1"
          strokeWidth={0.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={0.25}
          fill="none"
        />

        {/* Shimmer sweep — translates across the shield on a 3 s loop */}
        <rect x="-32" y="8" width="32" height="18" fill="url(#ahShimmer)" opacity={0.9}>
          <animateTransform
            attributeName="transform"
            type="translate"
            from="0 0"
            to="64 0"
            dur="3s"
            repeatCount="indefinite"
            calcMode="linear"
          />
        </rect>
      </g>

      {/* Inner highlight arc near the top of the shield */}
      <path
        d="M11 8 Q16 6 21 8"
        stroke="white"
        strokeWidth={0.6}
        strokeLinecap="round"
        fill="none"
        strokeOpacity={0.12}
      />
    </svg>
  );
}
