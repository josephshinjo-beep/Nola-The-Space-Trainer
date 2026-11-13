import type { EnvironmentalData } from './types';

/**
 * Checks and tidies incoming data before the app trusts it.
 * Anything that fails validation is rejected, and the app falls back to
 * simulated data rather than feeding bad numbers to the game.
 */

const FLARE_CLASS = /^([ABCMX])(\d{1,2}(?:\.\d+)?)$/;

/** Normalises a flare class like " m5.20 " to "M5.2". Returns null if it is not a valid class. */
export function normalizeFlareClass(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = FLARE_CLASS.exec(value.trim().toUpperCase());
  if (!match) return null;
  const magnitude = Number(match[2]);
  if (!Number.isFinite(magnitude) || magnitude <= 0) return null;
  return `${match[1]}${magnitude}`;
}

/**
 * Converts a flare class to its peak X-ray flux in watts per square metre,
 * the unit the classes are defined in (A=1e-8, B=1e-7, C=1e-6, M=1e-5, X=1e-4).
 */
export function flareClassToFlux(flareClass: string | null): number {
  const normal = normalizeFlareClass(flareClass);
  if (!normal) return 0;
  const base = { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 }[normal[0] as 'A' | 'B' | 'C' | 'M' | 'X'];
  return base * Number(normal.slice(1));
}

/** Picks the stronger of two flare classes. */
export function strongerFlare(a: string | null, b: string | null): string | null {
  return flareClassToFlux(a) >= flareClassToFlux(b) ? normalizeFlareClass(a) : normalizeFlareClass(b);
}

const isIsoDate = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value));

export type ValidationResult = { ok: true; data: EnvironmentalData } | { ok: false; errors: string[] };

export function validateEnvironmentalData(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null) return { ok: false, errors: ['Data is not an object.'] };
  const data = raw as Record<string, unknown>;
  const source = data.source as Record<string, unknown> | undefined;

  if (!source || (source.id !== 'mock' && source.id !== 'nasa-donki')) errors.push('Unknown data source.');
  if (source && typeof source.name !== 'string') errors.push('Source has no name.');
  if (source && typeof source.isSimulated !== 'boolean') errors.push('Source does not say whether it is simulated.');
  if (source?.id === 'nasa-donki' && source.isSimulated === true) errors.push('NASA data must not be marked as simulated.');
  if (source?.id === 'mock' && source.isSimulated !== true) errors.push('Mock data must be marked as simulated.');

  for (const field of ['periodStart', 'periodEnd', 'fetchedAt'] as const) {
    if (!isIsoDate(data[field])) errors.push(`${field} is not a valid date.`);
  }
  if (isIsoDate(data.periodStart) && isIsoDate(data.periodEnd) && Date.parse(data.periodStart) > Date.parse(data.periodEnd)) {
    errors.push('The period ends before it starts.');
  }

  const flare = data.strongestFlareClass;
  if (flare !== null && normalizeFlareClass(flare) === null) errors.push('strongestFlareClass is not a valid flare class.');

  const kp = data.maxKpIndex;
  if (kp !== null && (typeof kp !== 'number' || !Number.isFinite(kp) || kp < 0 || kp > 9)) errors.push('maxKpIndex must be between 0 and 9.');

  const events = data.solarParticleEvents;
  if (typeof events !== 'number' || !Number.isInteger(events) || events < 0) errors.push('solarParticleEvents must be a whole number of 0 or more.');

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      source: {
        id: source!.id as 'mock' | 'nasa-donki',
        name: source!.name as string,
        isSimulated: source!.isSimulated as boolean,
        url: typeof source!.url === 'string' ? source!.url : null,
      },
      periodStart: new Date(data.periodStart as string).toISOString(),
      periodEnd: new Date(data.periodEnd as string).toISOString(),
      fetchedAt: new Date(data.fetchedAt as string).toISOString(),
      strongestFlareClass: normalizeFlareClass(flare),
      maxKpIndex: kp as number | null,
      solarParticleEvents: events as number,
    },
  };
}
