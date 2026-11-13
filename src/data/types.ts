/**
 * Space-environment data, in one consistent shape no matter where it came
 * from. The simulation never sees raw NASA responses: adapters convert
 * them to this shape, validation checks it, and a separate model
 * (spaceWeatherModel.ts) decides what it means for the game.
 */

export interface DataSource {
  id: 'mock' | 'nasa-donki';
  name: string;
  /** True for made-up illustrative data. The interface always says so. */
  isSimulated: boolean;
  url: string | null;
}

export interface EnvironmentalData {
  source: DataSource;
  /** Start of the period the values describe (ISO 8601). */
  periodStart: string;
  /** End of the period the values describe (ISO 8601). */
  periodEnd: string;
  /** When this app fetched or generated the data (ISO 8601). */
  fetchedAt: string;
  /** Strongest solar flare in the period as an X-ray class such as "M5.2", or null if none. */
  strongestFlareClass: string | null;
  /** Highest planetary Kp index (0–9) in the period, or null if no storm was recorded. */
  maxKpIndex: number | null;
  /** Number of solar energetic particle events in the period. */
  solarParticleEvents: number;
}

export interface SpaceDataProvider {
  getEnvironmentalData(): Promise<EnvironmentalData>;
}
