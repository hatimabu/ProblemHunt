interface BrandLogoProps {
  className?: string;
  badgeClassName?: string;
}

export function BrandLogo({ className = "", badgeClassName = "" }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div className={`board-brand-mark ${badgeClassName}`.trim()} aria-hidden="true">
        <svg viewBox="0 0 64 64" className="h-7 w-7" fill="none">
          <path
            d="M42.7 10.6a14.1 14.1 0 0 0-16 18.4L12.6 43.1a5.7 5.7 0 1 0 8.1 8.1l14.2-14.2A14.1 14.1 0 0 0 53.3 21l-8.8 4-4.5-4.5 3.7-9.9Z"
            className="board-brand-mark__wrench"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="18.4" cy="45.2" r="2.8" className="board-brand-mark__core" />
          <path
            d="M49 15.5 55.2 9"
            className="board-brand-mark__spark"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="m47.4 24.1 8.9 1.2"
            className="board-brand-mark__spark"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div>
        <p className="font-mono-alt text-[0.68rem] uppercase tracking-[0.24em] text-[var(--board-soft)]">
          Problem Hunt
        </p>
        <p className="font-display text-base font-semibold tracking-[-0.04em] text-[var(--board-ink)]">
          Fix the blocker. Ship the work.
        </p>
      </div>
    </div>
  );
}
