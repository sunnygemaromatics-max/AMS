interface TsiLogoProps {
  size?: number;
  className?: string;
}

export function TsiLogo({ size = 36, className = "" }: TsiLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="TSI — The Studio Infinito"
    >
      <defs>
        <linearGradient id="tsiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(250 65% 55%)" />
          <stop offset="100%" stopColor="hsl(190 75% 65%)" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="8" fill="url(#tsiGradient)" />
      <text
        x="18"
        y="23"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="800"
        fontSize="13"
        fill="white"
        letterSpacing="-0.5"
      >
        TSI
      </text>
    </svg>
  );
}
