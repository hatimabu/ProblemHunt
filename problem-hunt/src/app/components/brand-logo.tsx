type BrandLogoVariant = "icon" | "wordmark" | "full";

interface BrandLogoProps {
  className?: string;
  badgeClassName?: string;
  variant?: BrandLogoVariant;
}

function ProblemHuntMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`problem-hunt-mark ${className}`.trim()}
      fill="none"
      role="img"
      aria-label="Problem Hunt mark"
    >
      <path d="M10 6H7v3M22 6h3v3M25 22v3h-3M10 25H7v-3" />
      <rect x="10" y="10" width="12" height="12" rx="2" />
      <path d="m12.8 16 2.1 2.1 4.4-4.4" />
    </svg>
  );
}

function ProblemHuntWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`problem-hunt-wordmark ${className}`.trim()}>
      <p className="problem-hunt-wordmark__name">Problem Hunt</p>
      <p className="problem-hunt-wordmark__tagline">Fix the blocker. Ship the work.</p>
    </div>
  );
}

export function BrandLogo({ className = "", badgeClassName = "", variant = "full" }: BrandLogoProps) {
  if (variant === "icon") return <ProblemHuntMark className={className} />;
  if (variant === "wordmark") return <ProblemHuntWordmark className={className} />;

  return (
    <div className={`problem-hunt-lockup ${className}`.trim()}>
      <div className={`board-brand-mark ${badgeClassName}`.trim()}>
        <ProblemHuntMark />
      </div>
      <ProblemHuntWordmark />
    </div>
  );
}
