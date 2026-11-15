import { useEffect, useState } from 'react';
import { NolaMascot } from '../features/companion/NolaMascot';

/**
 * Loading animations, in NOLA's colours:
 *  - OrbitSpinner: a planet with a moon going round it.
 *  - LoadingBar: a bar that fills to `progress` (0 to 1), or a sweeping
 *    stripe when the amount is not known.
 *  - Loader: spinner, words and bar together, for pages and panels.
 *  - GameLoader: the full loading screen for the station game, with steps.
 * With reduced motion the spinner stands still and the bar does not sweep;
 * the words always say what is happening.
 */

export function OrbitSpinner({ size = 48, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" strokeDasharray="3 5" />
      <circle cx="24" cy="24" r="9" fill="#18224a" stroke="#3de0f5" strokeWidth="2.5" />
      <path d="M17 21.5q7-4 14 0" fill="none" stroke="#3de0f5" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
      <g className="loader-orbit">
        <circle cx="24" cy="7" r="4" fill="#ff7a1a" />
        <circle cx="24" cy="7" r="7" fill="#ff7a1a" fillOpacity="0.2" />
      </g>
    </svg>
  );
}

export function LoadingBar({ progress, className = '' }: { progress?: number; className?: string }) {
  const known = typeof progress === 'number';
  return (
    <div className={`relative h-2.5 w-full overflow-hidden rounded-full border border-line bg-void ${className}`} aria-hidden="true">
      {known ? (
        <div className="loader-fill h-full rounded-full bg-gradient-to-r from-glow via-glow to-nola transition-[width] duration-500 ease-out" style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} />
      ) : (
        <div className="loader-sweep absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-transparent via-glow to-transparent" />
      )}
    </div>
  );
}

/** Spinner, words and an optional bar. `page` centres it in the page; `inline` sits in the flow of a panel. */
export function Loader({ label, progress, variant = 'page' }: { label: string; progress?: number; variant?: 'page' | 'inline' }) {
  if (variant === 'inline') {
    return (
      <div role="status" className="flex items-center gap-3 py-2 text-mist">
        <OrbitSpinner size={32} />
        <span className="font-semibold">{label}</span>
      </div>
    );
  }
  return (
    <div role="status" className="flex min-h-[50dvh] flex-col items-center justify-center gap-5 p-6 text-center">
      <OrbitSpinner size={72} className="text-glow" />
      <p className="font-display text-xl font-semibold text-star">{label}</p>
      <LoadingBar progress={progress} className="max-w-xs" />
    </div>
  );
}

const GAME_STEPS = ['Checking your training record', 'Loading your station', 'Building the station', 'Ready'] as const;
// The bar carries on from where the last step left it, even when a new screen takes over.
let lastGameProgress = 0;

/**
 * The station game's loading screen: NOLA, the current step and a bar that
 * creeps forward within each step (so it never looks stuck) and jumps ahead
 * when the step is done.
 */
export function GameLoader({ step }: { step: 0 | 1 | 2 }) {
  const floor = step / GAME_STEPS.length;
  const ceiling = (step + 1) / GAME_STEPS.length;
  const [progress, setProgress] = useState(() => Math.max(lastGameProgress, floor));
  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((value) => {
        // Ease towards (but never reach) the end of this step.
        const next = value + (ceiling - 0.02 - value) * 0.08;
        lastGameProgress = next;
        return next;
      });
    }, 120);
    return () => window.clearInterval(timer);
  }, [ceiling]);

  return (
    <div role="status" aria-live="polite" className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-void p-6 text-center">
      <div className="relative">
        <NolaMascot mood="curious" size={120} />
        <OrbitSpinner size={44} className="absolute -right-6 -top-2 text-glow" />
      </div>
      <p className="font-display text-2xl font-semibold text-star">{GAME_STEPS[step]}…</p>
      <LoadingBar progress={progress} className="max-w-sm" />
      <ol className="flex flex-wrap justify-center gap-2 text-sm font-semibold" aria-label="Loading steps">
        {GAME_STEPS.slice(0, 3).map((name, index) => (
          <li key={name} className={`rounded-full border px-3 py-1 ${index < step ? 'border-go/60 text-go' : index === step ? 'border-glow text-star' : 'border-line text-mist'}`}>
            {index < step ? '✓ ' : ''}
            {name}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Call when the game has finished loading, so the next visit's bar starts from zero. */
export function resetGameLoader() {
  lastGameProgress = 0;
}
