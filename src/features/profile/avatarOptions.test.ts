import { describe, expect, it } from 'vitest';
import { applySuitStyle, avatarPalette, DEFAULT_AVATAR, sanitizeAvatar, SUIT_COLORS, SUIT_STYLES, suitHex, VISOR_COLORS, visorHex } from './avatarOptions';

describe('suit styles', () => {
  it('include the five designs plus "My colours"', () => {
    expect(SUIT_STYLES.map((style) => style.label)).toEqual(['My colours', 'Navy Explorer', 'Orange Rescue', 'Mission White', 'Yellow Engineer', 'Red Comet']);
  });

  it('give every part of the suit a colour', () => {
    for (const style of SUIT_STYLES) {
      const palette = avatarPalette(applySuitStyle(DEFAULT_AVATAR, style.id));
      for (const part of ['suit', 'trim', 'stripe', 'helmet', 'helmetStripe', 'visor', 'gloves', 'boots', 'patch'] as const) {
        expect(palette[part], `${style.id} ${part}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('set the nearest plain colours too, so the 2D game drawing matches', () => {
    for (const style of SUIT_STYLES.filter((s) => s.id !== 'my-colours')) {
      expect(SUIT_COLORS.some((color) => color.id === style.base.suitColor), style.id).toBe(true);
      expect(VISOR_COLORS.some((color) => color.id === style.base.visorColor), style.id).toBe(true);
    }
    const navy = applySuitStyle(DEFAULT_AVATAR, 'navy-explorer');
    expect(navy).toMatchObject({ suitStyle: 'navy-explorer', suitColor: 'navy-blue', visorColor: 'mirror-silver' });
  });

  it("'My colours' uses the student's own suit and visor colours", () => {
    const own = { ...DEFAULT_AVATAR, suitStyle: 'my-colours' as const, suitColor: 'galaxy-purple' as const, visorColor: 'ocean-teal' as const };
    expect(avatarPalette(own)).toMatchObject({ suit: suitHex('galaxy-purple'), visor: visorHex('ocean-teal') });
  });

  it('keeps avatars saved before suit styles existed on their own colours', () => {
    expect(sanitizeAvatar({ suitColor: 'mars-red', visorColor: 'sun-gold', accessory: 'antenna' })).toEqual({ suitStyle: 'my-colours', suitColor: 'mars-red', visorColor: 'sun-gold', accessory: 'antenna' });
    expect(sanitizeAvatar({ suitStyle: 'nonsense' }).suitStyle).toBe('my-colours');
  });
});
