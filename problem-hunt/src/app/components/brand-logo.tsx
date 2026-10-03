import scoutRun from "../../assets/brand/scout-run.svg";

type BrandLogoVariant = "icon" | "wordmark" | "full";

interface BrandLogoProps {
  className?: string;
  badgeClassName?: string;
  variant?: BrandLogoVariant;
}

function ProblemHuntMark({ className = "", decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    <img
      src={scoutRun}
      width="116"
      height="64"
      className={`problem-hunt-mark ${className}`.trim()}
      alt={decorative ? "" : "Scout, the ProblemHunt fox"}
      aria-hidden={decorative || undefined}
      draggable={false}
    />
  );
}

function ProblemHuntWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`problem-hunt-wordmark ${className}`.trim()}>
      <p className="problem-hunt-wordmark__name">Problem<span>Hunt</span></p>
    </div>
  );
}

export function BrandLogo({ className = "", badgeClassName = "", variant = "full" }: BrandLogoProps) {
  if (variant === "icon") return <ProblemHuntMark className={className} />;
  if (variant === "wordmark") return <ProblemHuntWordmark className={className} />;

  return (
    <div className={`problem-hunt-lockup ${className}`.trim()}>
      <div className={`problem-hunt-scout ${badgeClassName}`.trim()}>
        <ProblemHuntMark decorative />
      </div>
      <ProblemHuntWordmark />
    </div>
  );
}
