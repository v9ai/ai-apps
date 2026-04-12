interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 24, className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 50"
      width={size * 4}
      height={size * 2}
      className={className}
      aria-label="Agentic Healthcare"
      role="img"
    >
      <defs>
        <linearGradient id="ahc-text-grad" x1="0" y1="0" x2="100" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <text
        x="50"
        y="20"
        textAnchor="middle"
        dominantBaseline="central"
        fill="url(#ahc-text-grad)"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="16"
        letterSpacing="-0.5"
      >
        Agentic
      </text>
      <text
        x="50"
        y="40"
        textAnchor="middle"
        dominantBaseline="central"
        fill="url(#ahc-text-grad)"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="16"
        letterSpacing="-0.5"
      >
        Healthcare
      </text>
    </svg>
  );
}
