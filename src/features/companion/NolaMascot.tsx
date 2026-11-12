/**
 * NOLA, the robot companion.
 *
 * NOTE: this is a stand-in drawn from the written brief (white and orange
 * body, cyan glowing eyes). It will be redrawn to match the official NOLA
 * reference image in Milestone 2; every page uses this one component, so
 * only this file needs to change.
 */

export type NolaMood = 'happy' | 'curious';

interface NolaMascotProps {
  mood?: NolaMood;
  /** Width in pixels; height scales with it. */
  size?: number;
  /** Gently bob up and down. */
  floating?: boolean;
  className?: string;
}

export function NolaMascot({ mood = 'happy', size = 160, floating = true, className = '' }: NolaMascotProps) {
  return (
    <svg
      viewBox="0 0 200 230"
      width={size}
      height={(size * 230) / 200}
      role="img"
      aria-label="NOLA, the friendly robot"
      className={`${floating ? 'animate-float' : ''} ${className}`}
    >
      <defs>
        <radialGradient id="nola-eye" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#d8fbff" />
          <stop offset="100%" stopColor="#3de0f5" />
        </radialGradient>
        <filter id="nola-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Hover light */}
      <ellipse cx="100" cy="220" rx="42" ry="7" fill="#3de0f5" opacity="0.25" />

      {/* Antenna */}
      <rect x="96" y="10" width="8" height="26" rx="4" fill="#ff7a1a" />
      <circle cx="100" cy="11" r="9" fill="#3de0f5" filter="url(#nola-glow)" />

      {/* Ear pods */}
      <rect x="14" y="70" width="22" height="44" rx="11" fill="#ff7a1a" />
      <rect x="164" y="70" width="22" height="44" rx="11" fill="#ff7a1a" />

      {/* Head and visor */}
      <rect x="28" y="32" width="144" height="118" rx="52" fill="#f4f7ff" />
      <rect x="44" y="58" width="112" height="66" rx="33" fill="#0f1736" />

      {/* Eyes */}
      <g filter="url(#nola-glow)" className="animate-blink" style={{ transformOrigin: '100px 90px' }}>
        {mood === 'happy' ? (
          <g fill="none" stroke="#3de0f5" strokeWidth="8" strokeLinecap="round">
            <path d="M64 96 Q76 78 88 96" />
            <path d="M112 96 Q124 78 136 96" />
          </g>
        ) : (
          <g fill="url(#nola-eye)">
            <circle cx="76" cy="90" r="13" />
            <circle cx="124" cy="90" r="13" />
          </g>
        )}
      </g>

      {/* Body */}
      <path d="M62 158 h76 a22 22 0 0 1 22 22 v6 a26 26 0 0 1 -26 26 h-68 a26 26 0 0 1 -26 -26 v-6 a22 22 0 0 1 22 -22z" fill="#f4f7ff" />
      <rect x="84" y="150" width="32" height="12" rx="6" fill="#c9d2ee" />
      <circle cx="100" cy="186" r="13" fill="#ff7a1a" />
      <circle cx="100" cy="186" r="6" fill="#3de0f5" filter="url(#nola-glow)" />

      {/* Arms */}
      <rect x="20" y="166" width="20" height="38" rx="10" fill="#ff7a1a" />
      <rect x="160" y="166" width="20" height="38" rx="10" fill="#ff7a1a" />
    </svg>
  );
}
