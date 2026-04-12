interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 24, className }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-label="Agentic Healthcare"
      role="img"
    >
      <defs>
        <linearGradient id="ahc-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      {/* Rounded cross */}
      <rect x="12" y="4" width="8" height="24" rx="3" fill="url(#ahc-grad)" />
      <rect x="4" y="12" width="24" height="8" rx="3" fill="url(#ahc-grad)" />
      {/* Pulse notch cut into the horizontal bar */}
      <path
        d="M7 16 L11 16 L13 12 L16 20 L19 12 L21 16 L25 16"
        stroke="var(--color-background, #111)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
