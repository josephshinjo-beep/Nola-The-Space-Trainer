import { ACCESSORIES, SUIT_COLORS, VISOR_COLORS, suitHex, visorHex, type AvatarConfig } from './avatarOptions';

interface AstronautAvatarProps {
  avatar: AvatarConfig;
  /** Width in pixels. */
  size?: number;
  className?: string;
}

const label = (options: readonly { id: string; label: string }[], id: string) =>
  options.find((option) => option.id === id)?.label ?? '';

/** The student's astronaut, drawn from their saved colour and accessory choices. */
export function AstronautAvatar({ avatar, size = 96, className = '' }: AstronautAvatarProps) {
  const suit = suitHex(avatar.suitColor);
  const visor = visorHex(avatar.visorColor);
  const accessory = label(ACCESSORIES, avatar.accessory).toLowerCase();
  const description =
    `Astronaut in a ${label(SUIT_COLORS, avatar.suitColor)} suit with a ${label(VISOR_COLORS, avatar.visorColor)} visor` +
    (avatar.accessory === 'none' ? '' : ` and ${accessory}`);

  return (
    <svg viewBox="0 0 120 140" width={size} height={(size * 140) / 120} role="img" aria-label={description} className={className}>
      {/* Backpack */}
      <rect x="22" y="70" width="76" height="52" rx="16" fill="#26315f" />

      {/* Suit */}
      <rect x="30" y="74" width="60" height="58" rx="20" fill={suit} stroke="#0b1230" strokeWidth="3" />
      <rect x="14" y="80" width="20" height="38" rx="10" fill={suit} stroke="#0b1230" strokeWidth="3" />
      <rect x="86" y="80" width="20" height="38" rx="10" fill={suit} stroke="#0b1230" strokeWidth="3" />
      {avatar.accessory === 'stripes' && (
        <g fill="#f4f7ff" opacity="0.9">
          <rect x="52" y="76" width="6" height="54" />
          <rect x="62" y="76" width="6" height="54" />
        </g>
      )}

      {/* Chest panel */}
      <rect x="46" y="94" width="28" height="18" rx="5" fill="#f4f7ff" stroke="#0b1230" strokeWidth="2" />
      <circle cx="54" cy="103" r="3" fill="#ff7a1a" />
      <rect x="60" y="100" width="10" height="6" rx="2" fill="#3de0f5" />
      {avatar.accessory === 'star-badge' && (
        <path d="M82 80Q82 88 90 88Q82 88 82 96Q82 88 74 88Q82 88 82 80Z" fill="#ffd54a" stroke="#0b1230" strokeWidth="1.5" />
      )}

      {/* Helmet */}
      {avatar.accessory === 'antenna' && (
        <g>
          <path d="M60 14 V2" stroke="#0b1230" strokeWidth="4" strokeLinecap="round" />
          <circle cx="60" cy="4" r="5" fill="#3de0f5" stroke="#0b1230" strokeWidth="2" />
        </g>
      )}
      <circle cx="60" cy="46" r="34" fill="#f4f7ff" stroke="#0b1230" strokeWidth="3" />
      <rect x="34" y="30" width="52" height="34" rx="16" fill={visor} stroke="#0b1230" strokeWidth="3" />
      <path d="M44 40 q8 -6 18 -4" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      {avatar.accessory === 'headset' && (
        <g>
          <rect x="20" y="38" width="10" height="20" rx="5" fill="#ff7a1a" stroke="#0b1230" strokeWidth="2" />
          <path d="M25 58 q2 16 22 14" fill="none" stroke="#0b1230" strokeWidth="3" strokeLinecap="round" />
          <circle cx="48" cy="72" r="4" fill="#0b1230" />
        </g>
      )}
    </svg>
  );
}
