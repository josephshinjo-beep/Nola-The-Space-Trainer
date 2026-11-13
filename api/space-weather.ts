/**
 * Fetches recent space weather from NASA's DONKI database and returns it
 * in the app's own EnvironmentalData shape (see src/data/types.ts).
 *
 * It runs on the server (a Vercel function) so the NASA API key is not
 * shipped to browsers, and so every student shares one cached answer
 * instead of each calling NASA.
 *
 * Server setting: NASA_API_KEY (free from https://api.nasa.gov). Without
 * it NASA's shared DEMO_KEY is used, which allows only a few requests an hour.
 *
 * DONKI reports EVENTS (flares, geomagnetic storms, particle events). It
 * does not report food, water, oxygen or battery levels, and this function
 * does not invent any. Turning these events into game effects is done
 * separately, in src/data/spaceWeatherModel.ts.
 */

const DONKI = 'https://api.nasa.gov/DONKI';
const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_DAYS = 7;

const FLARE_BASE: Record<string, number> = { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 };

/** Peak X-ray flux for a class such as "M5.2", or 0 if it cannot be read. */
function flareFlux(flareClass: unknown): number {
  if (typeof flareClass !== 'string') return 0;
  const match = /^([ABCMX])(\d{1,2}(?:\.\d+)?)$/.exec(flareClass.trim().toUpperCase());
  return match ? (FLARE_BASE[match[1]!] ?? 0) * Number(match[2]) : 0;
}

const asList = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? value.filter((item) => typeof item === 'object' && item !== null) : []);

/** Converts raw DONKI lists into the app's data shape. Unreadable entries are skipped, never guessed. */
export function normalizeDonki(flares: unknown, storms: unknown, particleEvents: unknown, now: Date) {
  let strongest: string | null = null;
  for (const flare of asList(flares)) {
    if (flareFlux(flare.classType) > flareFlux(strongest)) strongest = (flare.classType as string).trim().toUpperCase();
  }

  let maxKp: number | null = null;
  for (const storm of asList(storms)) {
    for (const reading of asList(storm.allKpIndex)) {
      const kp = Number(reading.kpIndex);
      if (Number.isFinite(kp) && kp >= 0 && kp <= 9 && (maxKp === null || kp > maxKp)) maxKp = kp;
    }
  }

  return {
    source: { id: 'nasa-donki', name: 'NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information)', isSimulated: false, url: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/' },
    periodStart: new Date(now.getTime() - PERIOD_DAYS * DAY_MS).toISOString(),
    periodEnd: now.toISOString(),
    fetchedAt: now.toISOString(),
    strongestFlareClass: strongest,
    maxKpIndex: maxKp,
    solarParticleEvents: asList(particleEvents).length,
  };
}

async function fetchList(kind: 'FLR' | 'GST' | 'SEP', start: string, end: string, key: string): Promise<unknown> {
  const response = await fetch(`${DONKI}/${kind}?startDate=${start}&endDate=${end}&api_key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`NASA DONKI ${kind} answered ${response.status}`);
  // DONKI sends an empty body, not "[]", when a period has no events.
  const text = (await response.text()).trim();
  return text ? JSON.parse(text) : [];
}

export async function GET(): Promise<Response> {
  const now = new Date();
  const day = (date: Date) => date.toISOString().slice(0, 10);
  const start = day(new Date(now.getTime() - PERIOD_DAYS * DAY_MS));
  const key = process.env.NASA_API_KEY || 'DEMO_KEY';

  try {
    const [flares, storms, particles] = await Promise.all([fetchList('FLR', start, day(now), key), fetchList('GST', start, day(now), key), fetchList('SEP', start, day(now), key)]);
    return new Response(JSON.stringify(normalizeDonki(flares, storms, particles, now)), {
      status: 200,
      // Shared cache for 30 minutes: space weather does not change by the second.
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
    });
  } catch (error) {
    console.error('Could not fetch NASA data', error);
    // The app falls back to simulated data when it sees this error.
    return new Response(JSON.stringify({ error: 'nasa_unavailable' }), { status: 502, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
}
