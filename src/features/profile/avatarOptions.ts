/**
 * Everything an astronaut avatar can be made of.
 * The avatar is saved as a few small ids, never as an image, so the same
 * choices colour the astronaut in the profile, the 2D game and the 3D game.
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
  { id: 'navy-blue', label: 'Navy Blue', hex: '#34507a' },
] as const satisfies readonly ColorOption[];

export const VISOR_COLORS = [
  { id: 'deep-blue', label: 'Deep Blue', hex: '#1b2a6b' },
  { id: 'sun-gold', label: 'Sun Gold', hex: '#f5b942' },
  { id: 'ocean-teal', label: 'Ocean Teal', hex: '#17b8a6' },
  { id: 'star-violet', label: 'Star Violet', hex: '#7c4dff' },
  { id: 'mirror-silver', label: 'Mirror Silver', hex: '#c9d1de' },
  { id: 'midnight-indigo', label: 'Midnight Indigo', hex: '#1c1752' },
] as const satisfies readonly ColorOption[];

export const ACCESSORIES = [
  { id: 'none', label: 'None' },
  { id: 'antenna', label: 'Antenna' },
  { id: 'star-badge', label: 'Star badge' },
  { id: 'stripes', label: 'Racing stripes' },
  { id: 'headset', label: 'Headset' },
] as const;

/**
 * Complete suit designs: each sets every colour of the suit at once.
 * "My colours" uses the student's own suit and visor colour choices.
 */
export interface SuitStyle {
  id: string;
  label: string;
  /** A short description for screen readers and the option list. */
  description: string;
  /** The nearest plain suit and visor colours, used by the simpler 2D game drawing. */
  base: { suitColor: string; visorColor: string };
  palette: {
    suit: string;
    /** Cuffs at the wrists and ankles, and the chest hose connectors. */
    trim: string;
    /** Zip, side stripes and the collar ring. */
    stripe: string;
    helmet: string;
    helmetStripe: string;
    visor: string;
    gloves: string;
    boots: string;
    /** Knee and shoulder patches. */
    patch: string;
  };
  /** Extra details. */
  chestPanel: boolean;
  sideStripes: boolean;
}

export const SUIT_STYLES = [
  { id: 'my-colours', label: 'My colours', description: 'your own suit and visor colours', base: { suitColor: '', visorColor: '' }, palette: { suit: '', trim: '#26315f', stripe: '#c9d1de', helmet: '#f4f7ff', helmetStripe: '#26315f', visor: '', gloves: '#3a3f4a', boots: '#2a2e36', patch: '' }, chestPanel: false, sideStripes: false },
  { id: 'navy-explorer', label: 'Navy Explorer', description: 'a navy suit with red cuffs and a mirror silver visor', base: { suitColor: 'navy-blue', visorColor: 'mirror-silver' }, palette: { suit: '#34507a', trim: '#c8453b', stripe: '#b9c3d6', helmet: '#ebe6de', helmetStripe: '#c8453b', visor: '#c9d1de', gloves: '#3a3f4a', boots: '#2a2e36', patch: '#2a3f63' }, chestPanel: false, sideStripes: false },
  { id: 'orange-rescue', label: 'Orange Rescue', description: 'an orange suit with blue trim and a midnight indigo visor', base: { suitColor: 'comet-orange', visorColor: 'midnight-indigo' }, palette: { suit: '#e8892b', trim: '#4f6c8f', stripe: '#c9cfd8', helmet: '#e5e1da', helmetStripe: '#44546e', visor: '#1c1752', gloves: '#3a3f4a', boots: '#2a2e36', patch: '#c56d1d' }, chestPanel: false, sideStripes: false },
  { id: 'mission-white', label: 'Mission White', description: 'a white suit with blue stripes, red cuffs, a chest control panel and a sun gold visor', base: { suitColor: 'moon-white', visorColor: 'sun-gold' }, palette: { suit: '#ece8e0', trim: '#d04a3d', stripe: '#4f86d6', helmet: '#f1eee8', helmetStripe: '#d04a3d', visor: '#c99a3a', gloves: '#e2ddd4', boots: '#6d7480', patch: '#44597a' }, chestPanel: true, sideStripes: true },
  { id: 'yellow-engineer', label: 'Yellow Engineer', description: 'a yellow suit with dark trim and a mirror silver visor', base: { suitColor: 'solar-yellow', visorColor: 'mirror-silver' }, palette: { suit: '#f1c82f', trim: '#c64a3b', stripe: '#3b4150', helmet: '#f1c82f', helmetStripe: '#3b4150', visor: '#c9d1de', gloves: '#3a3f4a', boots: '#3a3f4a', patch: '#3b4150' }, chestPanel: false, sideStripes: true },
  { id: 'red-comet', label: 'Red Comet', description: 'a red suit with white stripes, orange patches and a deep blue visor', base: { suitColor: 'mars-red', visorColor: 'deep-blue' }, palette: { suit: '#c9473f', trim: '#8a93a3', stripe: '#efece6', helmet: '#c9473f', helmetStripe: '#efece6', visor: '#1f3fd1', gloves: '#4a4f5a', boots: '#3d4250', patch: '#f08a3c' }, chestPanel: false, sideStripes: true },
] as const satisfies readonly SuitStyle[];

export type SuitStyleId = (typeof SUIT_STYLES)[number]['id'];
export type SuitColorId = (typeof SUIT_COLORS)[number]['id'];
export type VisorColorId = (typeof VISOR_COLORS)[number]['id'];
export type AccessoryId = (typeof ACCESSORIES)[number]['id'];

export interface AvatarConfig {
  /** A complete suit design, or 'my-colours' to use the suit and visor colours below. */
  suitStyle: SuitStyleId;
  suitColor: SuitColorId;
  visorColor: VisorColorId;
  accessory: AccessoryId;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  suitStyle: 'my-colours',
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
    // Avatars saved before suit styles existed keep their own colours.
    suitStyle: pick(SUIT_STYLES, data.suitStyle, DEFAULT_AVATAR.suitStyle),
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

/** Darkens a #rrggbb colour (amount 0-1), for patches and shading. */
export function shade(hex: string, amount: number): string {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((value >> shift) & 255) * (1 - amount));
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, '0')}`;
}

export function findSuitStyle(id: SuitStyleId): (typeof SUIT_STYLES)[number] {
  return SUIT_STYLES.find((style) => style.id === id) ?? SUIT_STYLES[0];
}

/** Every colour of the astronaut, from a suit style or from the student's own colours. */
export function avatarPalette(avatar: AvatarConfig): SuitStyle['palette'] & { chestPanel: boolean; sideStripes: boolean } {
  const style = findSuitStyle(avatar.suitStyle);
  if (style.id !== 'my-colours') return { ...style.palette, chestPanel: style.chestPanel, sideStripes: style.sideStripes };
  const suit = suitHex(avatar.suitColor);
  return { ...style.palette, suit, visor: visorHex(avatar.visorColor), patch: shade(suit, 0.22), chestPanel: false, sideStripes: false };
}

/** Choosing a suit style also sets the nearest plain colours, so the simpler 2D drawing matches. */
export function applySuitStyle(avatar: AvatarConfig, id: SuitStyleId): AvatarConfig {
  const style = findSuitStyle(id);
  if (style.id === 'my-colours') return { ...avatar, suitStyle: id };
  return { ...avatar, suitStyle: id, suitColor: style.base.suitColor as SuitColorId, visorColor: style.base.visorColor as VisorColorId };
}
