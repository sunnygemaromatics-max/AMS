interface TsiLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export function TsiLogo({ size = 36, className = "", animated = false }: TsiLogoProps) {
  // Use a unique id so multiple logos on a page don't share gradient defs
  const gid = `tsiGradient-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? "animate-float" : ""}`}
      aria-label="TSI — The Studio Infinito"
    >
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="50%" stopColor="#d946a3" />
          <stop offset="100%" stopColor="#f59e7e" />
        </linearGradient>
        <filter id={`${gid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#7c3aed" floodOpacity="0.3" />
        </filter>
      </defs>
      <rect width="36" height="36" rx="9" fill={`url(#${gid})`} filter={`url(#${gid}-shadow)`} />
      <text
        x="18"
        y="23"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="800"
        fontSize="13"
        fill="white"
        letterSpacing="-0.3"
      >
        TSI
      </text>
    </svg>
  );
}
