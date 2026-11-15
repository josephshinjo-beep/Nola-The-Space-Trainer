import { useId } from 'react';
import { ACCESSORIES, avatarPalette, findSuitStyle, SUIT_COLORS, VISOR_COLORS, type AvatarConfig } from './avatarOptions';

interface AstronautAvatarProps {
  avatar: AvatarConfig;
  /** Width in pixels. */
  size?: number;
  className?: string;
}

const label = (options: readonly { id: string; label: string }[], id: string) => options.find((option) => option.id === id)?.label ?? '';
const OUTLINE = '#0b1230';

/**
 * The student's astronaut: a chunky, friendly suit with a big round helmet,
 * ear pieces, a reflective visor, chest hose connectors, coloured cuffs and
 * knee patches. Every colour comes from the chosen suit style (or the
 * student's own colours). Original art.
 */
export function AstronautAvatar({ avatar, size = 96, className = '' }: AstronautAvatarProps) {
  const id = useId().replace(/:/g, '');
  const p = avatarPalette(avatar);
  const style = findSuitStyle(avatar.suitStyle);
  const accessory = label(ACCESSORIES, avatar.accessory).toLowerCase();
  const suitWords = style.id === 'my-colours' ? `a ${label(SUIT_COLORS, avatar.suitColor)} suit with a ${label(VISOR_COLORS, avatar.visorColor)} visor` : `the ${style.label} suit: ${style.description}`;
  const description = `Astronaut in ${suitWords}${avatar.accessory === 'none' ? '' : `, with ${accessory}`}`;

  return (
    <svg viewBox="0 0 120 150" width={size} height={(size * 150) / 120} role="img" aria-label={description} className={className}>
      <defs>
        <radialGradient id={`visor-${id}`} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="28%" stopColor={p.visor} stopOpacity="1" />
          <stop offset="100%" stopColor={OUTLINE} stopOpacity="0.55" />
        </radialGradient>
        <linearGradient id={`suit-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
        </linearGradient>
      </defs>

      {/* Backpack */}
      <rect x="27" y="74" width="66" height="44" rx="14" fill="#26315f" />

      {/* Legs, cuffs, knee patches and boots */}
      {[36, 64].map((x) => (
        <g key={x}>
          <rect x={x} y="104" width="20" height="30" rx="8" fill={p.suit} stroke={OUTLINE} strokeWidth="2.5" />
          <rect x={x + 4} y="112" width="12" height="9" rx="4" fill={p.patch} />
          <rect x={x - 1} y="126" width="22" height="5" rx="2.5" fill={p.trim} />
          <rect x={x - 3} y="131" width="26" height="14" rx="7" fill={p.boots} stroke={OUTLINE} strokeWidth="2.5" />
        </g>
      ))}

      {/* Arms with cuffs and gloves */}
      {[14, 86].map((x) => (
        <g key={x}>
          <rect x={x} y="78" width="20" height="32" rx="10" fill={p.suit} stroke={OUTLINE} strokeWidth="2.5" />
          <rect x={x - 1} y="100" width="22" height="5" rx="2.5" fill={p.trim} />
          <circle cx={x + 10} cy="111" r="8" fill={p.gloves} stroke={OUTLINE} strokeWidth="2.5" />
        </g>
      ))}

      {/* Body */}
      <rect x="30" y="72" width="60" height="42" rx="18" fill={p.suit} stroke={OUTLINE} strokeWidth="3" />
      <rect x="30" y="72" width="60" height="42" rx="18" fill={`url(#suit-${id})`} />
      {/* Shoulder patches */}
      <rect x="31" y="76" width="9" height="7" rx="3" fill={p.patch} />
      <rect x="80" y="76" width="9" height="7" rx="3" fill={p.patch} />
      {/* Zip */}
      <path d="M60 76 V110" stroke={p.stripe} strokeWidth="2" strokeDasharray="2 2" />
      {p.sideStripes && (
        <g fill="none" stroke={p.stripe} strokeWidth="3" strokeLinecap="round">
          <path d="M34 100 L50 110 L60 106 L70 110 L86 100" />
        </g>
      )}
      {/* Chest pocket */}
      <rect x="38" y="82" width="12" height="6" rx="2" fill={p.patch} opacity="0.85" />
      {/* Chest control panel (Mission White) */}
      {p.chestPanel && (
        <g>
          <rect x="49" y="80" width="22" height="14" rx="3" fill="#dfe4ee" stroke={OUTLINE} strokeWidth="1.5" />
          <rect x="52" y="83" width="9" height="8" rx="1.5" fill="#2b3a6b" />
          <rect x="53" y="84" width="3" height="3" fill="#ff5a4a" />
          <rect x="57" y="84" width="3" height="3" fill="#5be3a0" />
          <rect x="53" y="88" width="7" height="2" fill="#3de0f5" />
          <circle cx="66" cy="85" r="1.8" fill="#8a93a3" />
          <circle cx="66" cy="90" r="1.8" fill="#8a93a3" />
        </g>
      )}
      {/* Hose connectors and hoses */}
      <path d="M45 94 q-10 2 -16 12" fill="none" stroke="#e9edf5" strokeWidth="4" strokeLinecap="round" />
      <path d="M75 94 q10 2 16 12" fill="none" stroke="#e9edf5" strokeWidth="4" strokeLinecap="round" />
      <circle cx="45" cy="94" r="4.5" fill={p.trim} stroke={OUTLINE} strokeWidth="1.5" />
      <circle cx="75" cy="94" r="4.5" fill={p.trim} stroke={OUTLINE} strokeWidth="1.5" />
      {avatar.accessory === 'stripes' && (
        <g fill="#f4f7ff" opacity="0.9">
          <rect x="52" y="74" width="4" height="38" />
          <rect x="64" y="74" width="4" height="38" />
        </g>
      )}
      {avatar.accessory === 'star-badge' && <path d="M80 84Q80 90 86 90Q80 90 80 96Q80 90 74 90Q80 90 80 84Z" fill="#ffd54a" stroke={OUTLINE} strokeWidth="1.5" />}

      {/* Collar ring */}
      <ellipse cx="60" cy="72" rx="24" ry="6" fill={p.stripe} stroke={OUTLINE} strokeWidth="2.5" />

      {/* Helmet */}
      {avatar.accessory === 'antenna' && (
        <g>
          <path d="M60 10 V0" stroke={OUTLINE} strokeWidth="4" strokeLinecap="round" />
          <circle cx="60" cy="3" r="5" fill="#3de0f5" stroke={OUTLINE} strokeWidth="2" />
        </g>
      )}
      {/* Ear pieces */}
      <rect x="18" y="34" width="10" height="22" rx="5" fill={p.trim} stroke={OUTLINE} strokeWidth="2" />
      <rect x="92" y="34" width="10" height="22" rx="5" fill={p.trim} stroke={OUTLINE} strokeWidth="2" />
      <circle cx="60" cy="42" r="35" fill={p.helmet} stroke={OUTLINE} strokeWidth="3" />
      {/* Helmet stripes over the top */}
      <path d="M52 8 Q50 20 51 30" fill="none" stroke={p.helmetStripe} strokeWidth="3" strokeLinecap="round" />
      <path d="M68 8 Q70 20 69 30" fill="none" stroke={p.helmetStripe} strokeWidth="3" strokeLinecap="round" />
      {/* Visor with a metal rim and reflections */}
      <ellipse cx="60" cy="46" rx="29" ry="25" fill="#9aa3b5" stroke={OUTLINE} strokeWidth="2.5" />
      <ellipse cx="60" cy="46" rx="25" ry="21.5" fill={p.visor} />
      <ellipse cx="60" cy="46" rx="25" ry="21.5" fill={`url(#visor-${id})`} />
      <ellipse cx="48" cy="36" rx="6" ry="3.5" fill="#ffffff" opacity="0.75" transform="rotate(-20 48 36)" />
      <circle cx="74" cy="35" r="2.5" fill="#ffffff" opacity="0.6" />
      {avatar.accessory === 'headset' && (
        <g>
          <path d="M24 56 q2 16 22 14" fill="none" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" />
          <circle cx="47" cy="70" r="4" fill={OUTLINE} />
        </g>
      )}
    </svg>
  );
}
