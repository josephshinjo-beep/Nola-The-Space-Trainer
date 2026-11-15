import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sanitizeSettings } from '../accessibility/settings';
import { FOOTSTEPS, MUSIC, musicForPath, sliderToGain } from './audioEngine';

describe('music for each part of the app', () => {
  it('plays the lobby music in the lobby and on other pages', () => {
    for (const path of ['/', '/login', '/register', '/companion', '/profile', '/data-sources']) expect(musicForPath(path), path).toBe('lobby');
  });

  it('plays the module theme in the Academy and its lessons', () => {
    for (const path of ['/academy', '/academy/oxygen-and-breathing', '/academy/oxygen-and-breathing/lesson']) expect(musicForPath(path), path).toBe('module');
    expect(musicForPath('/academyx')).toBe('lobby');
  });

  it('plays the simulation music in the station game, in 2D and 3D, as a two-track playlist', () => {
    expect(musicForPath('/mission')).toBe('simulation');
    expect(musicForPath('/mission2d')).toBe('simulation');
    expect(MUSIC.simulation).toEqual(['/audio/simulation-1.mp3', '/audio/simulation-2.mp3']);
  });

  it('has every audio file in the public folder', () => {
    for (const file of [...Object.values(MUSIC).flat(), FOOTSTEPS]) expect(existsSync(`public${file}`), file).toBe(true);
  });
});

describe('volume sliders', () => {
  it('are squared, so the change is spread over the whole slider, and 0 is silence', () => {
    expect(sliderToGain(0)).toBe(0);
    expect(sliderToGain(1)).toBe(1);
    expect(sliderToGain(0.5)).toBe(0.25);
    expect(sliderToGain(2)).toBe(1);
    expect(sliderToGain(Number.NaN)).toBe(0);
  });

  it('are saved with the accessibility settings, with sensible defaults', () => {
    expect(sanitizeSettings(null)).toMatchObject({ musicVolume: 0.45, sfxVolume: 0.7, muted: false });
    expect(sanitizeSettings({ musicVolume: 3, sfxVolume: -1, muted: true })).toMatchObject({ musicVolume: 1, sfxVolume: 0, muted: true });
  });
});
