import { describe, expect, it } from 'vitest';
import { CURRICULUM } from '../academy/curriculum';
import { DEFAULT_AVATAR, sanitizeAvatar } from '../profile/avatarOptions';
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings';

describe('sanitizeSettings', () => {
  it('returns the defaults for missing or broken data', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('nonsense')).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ textSize: 'gigantic', highContrast: 'yes' })).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values and clamps the volume', () => {
    const result = sanitizeSettings({ textSize: 'xlarge', highContrast: true, speechRate: 'slow', voiceVolume: 7 });
    expect(result).toMatchObject({ textSize: 'xlarge', highContrast: true, speechRate: 'slow', voiceVolume: 1 });
    expect(sanitizeSettings({ voiceVolume: -3 }).voiceVolume).toBe(0);
    expect(sanitizeSettings({ voiceVolume: Number.NaN }).voiceVolume).toBe(1);
  });
});

describe('sanitizeAvatar', () => {
  it('falls back to the default for unknown choices', () => {
    expect(sanitizeAvatar(undefined)).toEqual(DEFAULT_AVATAR);
    expect(sanitizeAvatar({ suitColor: 'invisible', accessory: 42 })).toEqual(DEFAULT_AVATAR);
  });

  it('keeps valid choices', () => {
    const avatar = { suitColor: 'mars-red', visorColor: 'sun-gold', accessory: 'headset' };
    expect(sanitizeAvatar(avatar)).toEqual(avatar);
  });
});

describe('curriculum', () => {
  it('has eight modules, numbered in order, with unique ids and unlocks', () => {
    expect(CURRICULUM).toHaveLength(8);
    expect(CURRICULUM.map((m) => m.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(new Set(CURRICULUM.map((m) => m.id)).size).toBe(8);
    expect(new Set(CURRICULUM.map((m) => m.unlock.systemId)).size).toBe(8);
    for (const module of CURRICULUM) expect(module.questions.length).toBeGreaterThanOrEqual(5);
  });
});
