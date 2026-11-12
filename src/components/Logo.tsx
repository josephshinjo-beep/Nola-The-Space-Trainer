/** The NOLA wordmark: an orbit ring with a cyan moon, next to the name. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
        <circle cx="24" cy="24" r="11" fill="#ff7a1a" />
        <ellipse cx="24" cy="24" rx="21" ry="8" fill="none" stroke="#f4f7ff" strokeWidth="2.5" transform="rotate(-24 24 24)" />
        <circle cx="42" cy="14" r="4" fill="#3de0f5" />
      </svg>
      <span className="leading-none">
        <span className="block font-display text-2xl font-bold tracking-wide text-star">NOLA</span>
        <span className="block text-[0.7rem] font-bold uppercase tracking-[0.3em] text-glow">Space Trainer</span>
      </span>
    </span>
  );
}
