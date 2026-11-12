/**
 * NOLA, the robot companion.
 *
 * An original flat-vector character. It carries over the identity of the
 * reference artwork (white and orange panels, cyan LED smile-eyes, antenna
 * with a glowing tip, chest badge, friendly wave) on its own silhouette:
 * one wide visor and a hover base.
 *
 * Every page draws NOLA through this one component.
 */

export type NolaMood = 'happy' | 'curious' | 'excited' | 'thinking';

interface NolaMascotProps {
  mood?: NolaMood;
  /** Width in pixels; height scales with it. */
  size?: number;
  /** Gently bob up and down. */
  floating?: boolean;
  /** Raise an arm and wave. */
  waving?: boolean;
  className?: string;
}

const WHITE = '#f4f7ff';
const SHADE = '#d5dcf2';
const ORANGE = '#ff7a1a';
const CYAN = '#3de0f5';
const DARK = '#26315f';
const VISOR = '#0b1230';

/** A four-pointed sparkle, like the star in the NOLA logo. */
function sparkle(cx: number, cy: number, r: number): string {
  return `M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z`;
}

function Eyes({ mood }: { mood: NolaMood }) {
  const stroke = { fill: 'none', stroke: CYAN, strokeWidth: 9, strokeLinecap: 'round' as const };
  switch (mood) {
    case 'curious':
      return (
        <g fill={CYAN}>
          <circle cx="88" cy="88" r="11" />
          <circle cx="152" cy="86" r="14" />
        </g>
      );
    case 'excited':
      return (
        <g {...stroke} strokeWidth={10}>
          <path d="M70 98 Q88 66 106 98" />
          <path d="M134 98 Q152 66 170 98" />
        </g>
      );
    case 'thinking':
      return (
        <g>
          <path d="M76 90 H100" {...stroke} />
          <circle cx="154" cy="84" r="11" fill={CYAN} />
        </g>
      );
    default:
      return (
        <g {...stroke}>
          <path d="M74 96 Q88 74 102 96" />
          <path d="M138 96 Q152 74 166 96" />
        </g>
      );
  }
}

export function NolaMascot({ mood = 'happy', size = 160, floating = true, waving = false, className = '' }: NolaMascotProps) {
  return (
    <svg
      viewBox="-20 0 280 270"
      width={size}
      height={(size * 270) / 280}
      role="img"
      aria-label="NOLA, the friendly robot"
      className={`${floating ? 'animate-float' : ''} ${className}`}
    >
      <defs>
        <filter id="nola-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Hover light under the base */}
      <ellipse cx="120" cy="257" rx="60" ry="8" fill={CYAN} opacity="0.28" />

      {/* Antenna */}
      <path d="M150 44 L159 16" stroke={DARK} strokeWidth="5" strokeLinecap="round" />
      <circle cx="160" cy="12" r="7" fill={CYAN} filter="url(#nola-glow)" />

      {/* Left arm (resting) */}
      <rect x="38" y="150" width="22" height="54" rx="11" fill={WHITE} />
      <rect x="38" y="184" width="22" height="10" fill={ORANGE} />
      <circle cx="49" cy="210" r="10" fill={DARK} />

      {/* Right arm: waving or resting */}
      {waving ? (
        <g className="animate-wave" style={{ transformOrigin: '191px 158px' }}>
          <g transform="rotate(24 191 158)">
            <rect x="180" y="98" width="22" height="66" rx="11" fill={WHITE} />
            <rect x="180" y="110" width="22" height="10" fill={ORANGE} />
            <rect x="175" y="72" width="32" height="28" rx="10" fill={DARK} />
            <rect x="176" y="58" width="8" height="20" rx="4" fill={WHITE} />
            <rect x="187" y="55" width="8" height="22" rx="4" fill={WHITE} />
            <rect x="198" y="58" width="8" height="20" rx="4" fill={WHITE} />
          </g>
        </g>
      ) : (
        <g>
          <rect x="180" y="150" width="22" height="54" rx="11" fill={WHITE} />
          <rect x="180" y="184" width="22" height="10" fill={ORANGE} />
          <circle cx="191" cy="210" r="10" fill={DARK} />
        </g>
      )}

      {/* Hover base */}
      <rect x="72" y="212" width="96" height="28" rx="14" fill={DARK} />
      <rect x="86" y="230" width="68" height="6" rx="3" fill={CYAN} filter="url(#nola-glow)" />

      {/* Body */}
      <rect x="60" y="138" width="120" height="86" rx="28" fill={WHITE} />
      <path d="M60 166 a28 28 0 0 1 28 -28 h8 l-14 22 v40 h-22z" fill={ORANGE} />
      <path d="M180 166 a28 28 0 0 0 -28 -28 h-8 l14 22 v40 h22z" fill={ORANGE} />
      <rect x="92" y="154" width="56" height="36" rx="10" fill={VISOR} />
      <path d="M102 180 Q112 160 136 162" fill="none" stroke={WHITE} strokeWidth="3" strokeLinecap="round" />
      <path d={sparkle(136, 166, 7)} fill={ORANGE} />
      <rect x="100" y="200" width="40" height="7" rx="3.5" fill={CYAN} filter="url(#nola-glow)" />

      {/* Neck */}
      <rect x="106" y="124" width="28" height="18" rx="6" fill="#8f9bc4" />
      <rect x="101" y="130" width="38" height="6" rx="3" fill={ORANGE} />

      {/* Head */}
      <circle cx="36" cy="86" r="14" fill={ORANGE} />
      <circle cx="204" cy="86" r="14" fill={ORANGE} />
      <rect x="36" y="42" width="168" height="88" rx="38" fill={WHITE} />
      <path d="M74 42 h92 a38 38 0 0 1 14 3 l-8 9 h-104 l-8 -9 a38 38 0 0 1 14 -3z" fill={ORANGE} />
      <rect x="36" y="112" width="168" height="18" rx="9" fill={SHADE} opacity="0.6" />
      <rect x="52" y="60" width="136" height="56" rx="26" fill={VISOR} stroke={DARK} strokeWidth="3" />

      {/* Eyes */}
      <g filter="url(#nola-glow)" className="animate-blink" style={{ transformOrigin: '120px 90px' }}>
        <Eyes mood={mood} />
      </g>

      {/* Extra flourishes for some moods */}
      {mood === 'excited' && (
        <g fill={ORANGE}>
          <path d={sparkle(22, 40, 10)} />
          <path d={sparkle(218, 34, 8)} />
          <path d={sparkle(226, 118, 6)} fill={CYAN} />
        </g>
      )}
      {mood === 'thinking' && (
        <g fill={CYAN}>
          <circle cx="196" cy="30" r="4" />
          <circle cx="210" cy="20" r="5" />
          <circle cx="226" cy="8" r="6" />
        </g>
      )}
    </svg>
  );
}
