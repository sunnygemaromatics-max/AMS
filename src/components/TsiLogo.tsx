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
      <rect width="36" height="36" rx="8" fill="currentColor" className="text-sidebar-primary" />
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
