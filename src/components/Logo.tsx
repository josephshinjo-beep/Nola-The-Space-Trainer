/** The NOLA wordmark: an orbit swoosh ending in an orange star. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg viewBox="0 0 48 48" width="42" height="42" aria-hidden="true" className="shrink-0">
        <circle cx="22" cy="28" r="12" fill="#18224a" stroke="#3de0f5" strokeWidth="2" />
        <path d="M3 40 Q10 8 38 9" fill="none" stroke="#f4f7ff" strokeWidth="3" strokeLinecap="round" />
        <path d="M39 1Q39 9 47 9Q39 9 39 17Q39 9 31 9Q39 9 39 1Z" fill="#ff7a1a" />
      </svg>
      <span className="leading-none">
        <span className="block font-display text-2xl font-bold tracking-wide text-star">NOLA</span>
        <span className="block text-[0.7rem] font-bold uppercase tracking-[0.3em] text-glow">Space Trainer</span>
      </span>
    </span>
  );
}
