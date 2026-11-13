import type { StepInputs } from '../simulation/types';
import type { EnvironmentalData } from './types';
import { flareClassToFlux } from './validation';

/**
 * Turns space-weather observations into inputs for the game.
 *
 * WHAT IS REAL: the two scales below are the public NOAA Space Weather
 * Scales. R (radio blackouts) is defined by a flare's peak X-ray flux and
 * G (geomagnetic storms) by the planetary Kp index.
 *
 * WHAT IS OURS: how those scales change the game (how often storms start
 * and how strong they are) is a simplified mapping invented for NOLA. It
 * is a game mechanic, not a radiation forecast.
 */

/** NOAA R-scale from peak X-ray flux: R1 at M1, R2 at M5, R3 at X1, R4 at X10, R5 at X20. */
export function radioBlackoutScale(flareClass: string | null): number {
  const flux = flareClassToFlux(flareClass);
  if (flux >= 2e-3) return 5;
  if (flux >= 1e-3) return 4;
  if (flux >= 1e-4) return 3;
  if (flux >= 5e-5) return 2;
  if (flux >= 1e-5) return 1;
  return 0;
}

/** NOAA G-scale from the Kp index: G1 at Kp 5 up to G5 at Kp 9. */
export function geomagneticScale(kp: number | null): number {
  return kp === null || kp < 5 ? 0 : Math.min(5, Math.floor(kp) - 4);
}

export type ActivityLevel = 'quiet' | 'active' | 'stormy';

export interface SpaceWeatherSummary {
  level: ActivityLevel;
  headline: string;
  rScale: number;
  gScale: number;
  inputs: StepInputs['spaceWeather'];
}

export function summarizeSpaceWeather(data: EnvironmentalData): SpaceWeatherSummary {
  const rScale = radioBlackoutScale(data.strongestFlareClass);
  const gScale = geomagneticScale(data.maxKpIndex);
  const particles = data.solarParticleEvents;

  // Game mapping (ours): more solar activity means storms are picked more often...
  const stormChance = Math.min(3, 1 + (rScale >= 1 ? 0.5 : 0) + (rScale >= 3 ? 0.5 : 0) + (gScale >= 1 ? 0.5 : 0) + (particles >= 1 ? 1 : 0));
  // ...and particle events or very strong flares make them hit harder.
  const stormIntensity = particles >= 2 || (rScale >= 3 && gScale >= 3) ? 3 : particles >= 1 || rScale >= 3 ? 2 : 1;

  const level: ActivityLevel = stormIntensity >= 2 ? 'stormy' : stormChance > 1 ? 'active' : 'quiet';
  const headline = level === 'stormy' ? 'The Sun is very active. Expect stronger solar storms.' : level === 'active' ? 'The Sun is active. Solar storms are more likely.' : 'The Sun is quiet.';

  return { level, headline, rScale, gScale, inputs: { stormChance, stormIntensity } };
}
