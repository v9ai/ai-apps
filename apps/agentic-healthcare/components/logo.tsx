interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 24, className }: LogoProps) {
  const fontSize = size * 0.65;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-label="Agentic Healthcare"
      role="img"
    >
      <defs>
        <linearGradient id="ahc-text-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <text
        x="16"
        y="16"
        textAnchor="middle"
        dominantBaseline="central"
        fill="url(#ahc-text-grad)"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize={fontSize}
        letterSpacing="-0.5"
      >
        AH
      </text>
    </svg>
  );
}
