export function LanternMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="lanternly-flame" cx="50%" cy="58%" r="50%">
          <stop offset="0%" stopColor="#fff3cf" />
          <stop offset="55%" stopColor="#ffc861" />
          <stop offset="100%" stopColor="#e8a23a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="14" r="9" fill="url(#lanternly-flame)" opacity="0.35" className="flicker" />
      <path d="M9 4.5h6M12 2.5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <rect x="7" y="6.5" width="10" height="13" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 10.2c1.4 1.5 2 2.6 2 3.6a2 2 0 0 1-4 0c0-1 .6-2.1 2-3.6Z" fill="#ffc861" className="flicker" />
      <path d="M9 21.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 text-text">
      <LanternMark />
      <span className="font-serif text-[1.35rem] font-semibold tracking-tight">Lanternly</span>
    </span>
  );
}
