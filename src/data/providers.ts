import type { EnvironmentalData, SpaceDataProvider } from './types';
import { validateEnvironmentalData } from './validation';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * SIMULATED data for development and for when NASA cannot be reached.
 *
 * It cycles through a few made-up but realistic situations, changing once
 * a day so the game feels different from day to day. These values are
 * illustrative only and are always labelled "Simulated data" on screen.
 * They are NOT NASA measurements.
 */
const ILLUSTRATIVE_SCENARIOS = [
  { strongestFlareClass: 'B4.1', maxKpIndex: 2, solarParticleEvents: 0 },
  { strongestFlareClass: 'C7.3', maxKpIndex: 3, solarParticleEvents: 0 },
  { strongestFlareClass: 'M2.4', maxKpIndex: 4, solarParticleEvents: 0 },
  { strongestFlareClass: 'C2.0', maxKpIndex: 6, solarParticleEvents: 0 },
  { strongestFlareClass: 'X1.5', maxKpIndex: 7, solarParticleEvents: 1 },
] as const;

export class MockSpaceDataProvider implements SpaceDataProvider {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async getEnvironmentalData(): Promise<EnvironmentalData> {
    const now = this.now();
    const day = Math.floor(now.getTime() / DAY_MS);
    const scenario = ILLUSTRATIVE_SCENARIOS[day % ILLUSTRATIVE_SCENARIOS.length]!;
    return {
      source: { id: 'mock', name: 'Simulated data (not real measurements)', isSimulated: true, url: null },
      periodStart: new Date(now.getTime() - 7 * DAY_MS).toISOString(),
      periodEnd: now.toISOString(),
      fetchedAt: now.toISOString(),
      ...scenario,
    };
  }
}

/**
 * Real data from NASA's DONKI space-weather database.
 *
 * The browser does not call NASA directly. It asks our own small backend
 * function (/api/space-weather), which holds the NASA API key, fetches
 * recent solar flares, geomagnetic storms and particle events, and
 * returns them already converted to EnvironmentalData. This class only
 * has to fetch and validate.
 */
export class NasaDonkiProvider implements SpaceDataProvider {
  constructor(
    private readonly endpoint = '/api/space-weather',
    private readonly fetcher: typeof fetch = (...args) => fetch(...args),
  ) {}

  async getEnvironmentalData(): Promise<EnvironmentalData> {
    const response = await this.fetcher(this.endpoint, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Space weather service answered ${response.status}.`);
    const result = validateEnvironmentalData(await response.json());
    if (!result.ok) throw new Error(`Space weather data failed validation: ${result.errors.join(' ')}`);
    if (result.data.source.isSimulated) throw new Error('Expected real NASA data but received simulated data.');
    return result.data;
  }
}

/** Tries the main provider and quietly falls back to another if it fails. */
export class FallbackProvider implements SpaceDataProvider {
  constructor(
    private readonly primary: SpaceDataProvider,
    private readonly backup: SpaceDataProvider,
  ) {}

  async getEnvironmentalData(): Promise<EnvironmentalData> {
    try {
      return await this.primary.getEnvironmentalData();
    } catch (error) {
      console.warn('Using backup space data:', error);
      return this.backup.getEnvironmentalData();
    }
  }
}

/**
 * Chooses the data source. Set VITE_SPACE_DATA_SOURCE=nasa to use real
 * NASA data (with simulated data as the safety net); anything else uses
 * simulated data only.
 */
export function createSpaceDataProvider(sourceSetting: string | undefined = import.meta.env.VITE_SPACE_DATA_SOURCE): SpaceDataProvider {
  const mock = new MockSpaceDataProvider();
  return sourceSetting === 'nasa' ? new FallbackProvider(new NasaDonkiProvider(), mock) : mock;
}
