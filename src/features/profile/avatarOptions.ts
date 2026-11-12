/**
 * Everything an astronaut avatar can be made of.
 * The avatar is saved as three small ids, never as an image, so the same
 * choices can later colour the astronaut inside the station game.
 */

export interface ColorOption {
  id: string;
  /** Every colour has a name, so nobody has to rely on seeing the colour. */
  label: string;
  hex: string;
}

export const SUIT_COLORS = [
  { id: 'comet-orange', label: 'Comet Orange', hex: '#ff7a1a' },
  { id: 'nebula-cyan', label: 'Nebula Cyan', hex: '#3de0f5' },
  { id: 'mars-red', label: 'Mars Red', hex: '#ef5350' },
  { id: 'aurora-green', label: 'Aurora Green', hex: '#5be3a0' },
  { id: 'solar-yellow', label: 'Solar Yellow', hex: '#ffd54a' },
  { id: 'galaxy-purple', label: 'Galaxy Purple', hex: '#a78bfa' },
  { id: 'moon-white', label: 'Moon White', hex: '#e8ecf8' },
  { id: 'rocket-pink', label: 'Rocket Pink', hex: '#ff7eb6' },
] as const satisfies readonly ColorOption[];

export const VISOR_COLORS = [
  { id: 'deep-blue', label: 'Deep Blue', hex: '#1b2a6b' },
  { id: 'sun-gold', label: 'Sun Gold', hex: '#f5b942' },
  { id: 'ocean-teal', label: 'Ocean Teal', hex: '#17b8a6' },
  { id: 'star-violet', label: 'Star Violet', hex: '#7c4dff' },
] as const satisfies readonly ColorOption[];

export const ACCESSORIES = [
  { id: 'none', label: 'None' },
  { id: 'antenna', label: 'Antenna' },
  { id: 'star-badge', label: 'Star badge' },
  { id: 'stripes', label: 'Racing stripes' },
  { id: 'headset', label: 'Headset' },
] as const;

export type SuitColorId = (typeof SUIT_COLORS)[number]['id'];
export type VisorColorId = (typeof VISOR_COLORS)[number]['id'];
export type AccessoryId = (typeof ACCESSORIES)[number]['id'];

export interface AvatarConfig {
  suitColor: SuitColorId;
  visorColor: VisorColorId;
  accessory: AccessoryId;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  suitColor: 'comet-orange',
  visorColor: 'deep-blue',
  accessory: 'none',
};

function pick<T extends { id: string }>(options: readonly T[], value: unknown, fallback: T['id']): T['id'] {
  return options.some((option) => option.id === value) ? (value as T['id']) : fallback;
}

/** Turns whatever is stored in the database into a safe, complete avatar. */
export function sanitizeAvatar(raw: unknown): AvatarConfig {
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    suitColor: pick(SUIT_COLORS, data.suitColor, DEFAULT_AVATAR.suitColor),
    visorColor: pick(VISOR_COLORS, data.visorColor, DEFAULT_AVATAR.visorColor),
    accessory: pick(ACCESSORIES, data.accessory, DEFAULT_AVATAR.accessory),
  };
}

export function suitHex(id: SuitColorId): string {
  return SUIT_COLORS.find((color) => color.id === id)?.hex ?? SUIT_COLORS[0].hex;
}

export function visorHex(id: VisorColorId): string {
  return VISOR_COLORS.find((color) => color.id === id)?.hex ?? VISOR_COLORS[0].hex;
}
