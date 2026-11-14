/**
 * How long a radio signal takes between Earth and a base on the Moon or Mars.
 * Radio travels at the speed of light. These are REAL values, shown to the
 * player as they are; only the wait in the game is sped up (see `waitPlan`).
 */

import type { SiteId } from '../../simulation/types';

export type { SiteId };

/** Speed of light, km/s (exact by definition: 299,792,458 m/s). */
export const LIGHT_KM_S = 299_792.458;
/** One astronomical unit in km (exact by IAU definition). */
export const AU_KM = 149_597_870.7;
/** Average Earth–Moon distance, km (NASA Moon Fact Sheet: 384,400 km). */
export const MOON_KM = 384_400;

// JPL "Keplerian Elements for Approximate Positions of the Major Planets"
// (E. M. Standish), Table 1, valid 1800–2050. Each pair is [value at J2000,
// change per Julian century]: a (au), e, I, L, long. perihelion, long. node (degrees).
type Elements = [number, number][];
const EARTH: Elements = [[1.00000261, 0.00000562], [0.01671123, -0.00004392], [-0.00001531, -0.01294668], [100.46457166, 35999.37244981], [102.93768193, 0.32327364], [0, 0]];
const MARS: Elements = [[1.52371034, 0.00001847], [0.0933941, 0.00007882], [1.84969142, -0.00813131], [-4.55343205, 19140.30268499], [-23.94362959, 0.44441088], [49.55953891, -0.29257343]];

const RAD = Math.PI / 180;

/** Heliocentric position (au, ecliptic J2000) following JPL's recipe. */
function position(elements: Elements, date: Date): [number, number, number] {
  const T = (date.getTime() / 86_400_000 + 2_440_587.5 - 2_451_545.0) / 36_525;
  const [a, e, I, L, w, O] = elements.map(([value, rate]) => value + rate * T) as [number, number, number, number, number, number];
  const argPeri = w - O;
  let M = (((L - w) % 360) + 540) % 360 - 180;
  // Kepler's equation, solved by Newton's method (in degrees, as JPL describes).
  const eDeg = e / RAD;
  let E = M + eDeg * Math.sin(M * RAD);
  for (let i = 0; i < 20; i++) {
    const dE = (M - (E - eDeg * Math.sin(E * RAD))) / (1 - e * Math.cos(E * RAD));
    E += dE;
    if (Math.abs(dE) < 1e-8) break;
  }
  const x = a * (Math.cos(E * RAD) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E * RAD);
  const [cw, sw, cO, sO, cI, sI] = [Math.cos(argPeri * RAD), Math.sin(argPeri * RAD), Math.cos(O * RAD), Math.sin(O * RAD), Math.cos(I * RAD), Math.sin(I * RAD)];
  return [
    (cw * cO - sw * sO * cI) * x + (-sw * cO - cw * sO * cI) * y,
    (cw * sO + sw * cO * cI) * x + (-sw * sO + cw * cO * cI) * y,
    sw * sI * x + cw * sI * y,
  ];
}

/** Earth–Mars distance in km on a date, from planet orbits (accurate to well under 1%). */
export function earthMarsKm(date: Date): number {
  const [ex, ey, ez] = position(EARTH, date);
  const [mx, my, mz] = position(MARS, date);
  return Math.hypot(mx - ex, my - ey, mz - ez) * AU_KM;
}

export interface SiteLink {
  site: SiteId;
  name: string;
  km: number;
  /** One-way signal time in real seconds. */
  oneWaySeconds: number;
}

export function siteLink(site: SiteId, date: Date = new Date()): SiteLink {
  const km = site === 'moon' ? MOON_KM : earthMarsKm(date);
  return { site, name: site === 'moon' ? 'Moon Base' : 'Mars Base', km, oneWaySeconds: km / LIGHT_KM_S };
}

/** "1.3 seconds", "12 min 30 s". Real time, for display. */
export function formatDelay(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)} seconds`;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)} min ${String(whole % 60).padStart(2, '0')} s`;
}

/** "12:30" or "0:02.6": a countdown of real delay time. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, seconds);
  if (s < 10) return `0:0${s.toFixed(1)}`;
  const whole = Math.ceil(s);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
