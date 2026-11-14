/**
 * Recent space-weather EVENTS from NASA DONKI: solar flares (FLR), coronal
 * mass ejections (CME) and solar energetic particle events (SEP), turned
 * into a short list the game can use for radiation-storm alerts.
 *
 * Where the data comes from, in order:
 *   1. api.nasa.gov/DONKI/{FLR,CME,SEP}             with NASA_API_KEY (if set)
 *   2. ccmc.gsfc.nasa.gov/DONKI-API/get/{FLR,CME,SEP} the official DONKI web
 *      service (DONKI-API 2.0, needs no key)
 *   3. the last good answer kept in this server's memory (up to 24 hours old)
 * If all three fail it answers 502, and the app falls back to the archive of
 * real past events bundled with it (src/data/spaceEventsArchive.ts), so the
 * game keeps working offline.
 *
 * Endpoints and parameters checked against the DONKI OpenAPI document at
 * https://ccmc.gsfc.nasa.gov/DONKI/api/openapi/ (November 2026).
 *
 * Server setting: NASA_API_KEY, free from https://api.nasa.gov. The key is
 * sent only to api.nasa.gov and is never returned to the browser.
 */

export const maxDuration = 20;

export type DonkiType = 'FLR' | 'CME' | 'SEP';

/** One real event, cut down to what the game shows. */
export interface SpaceEvent {
  /** DONKI's own id, for example "2024-05-14T16:46:00-FLR-001". */
  id: string;
  type: DonkiType;
  /** When it happened (UTC, ISO 8601). */
  time: string;
  /** 1 = strong, 2 = severe, 3 = extreme. A game rating; see `rateEvent`. */
  severity: 1 | 2 | 3;
  /** A short description of what was measured, for example "class X8.7" or "1,935 km/s". */
  detail: string;
  /** The event's page on the DONKI website, when DONKI gives one. */
  link: string | null;
}

export interface SpaceEventFeed {
  events: SpaceEvent[];
  source: 'nasa-api' | 'donki-ccmc' | 'cache' | 'archive';
  /** When the data was fetched from NASA (ISO 8601). */
  fetchedAt: string;
  periodStart: string;
  periodEnd: string;
}

const NASA_URL = 'https://api.nasa.gov/DONKI';
const CCMC_URL = 'https://ccmc.gsfc.nasa.gov/DONKI-API/get';
const PERIOD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const FRESH_MS = 30 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;

/**
 * Which real events become game storms, and how strong. GAME RULES, kept
 * simple for the game, not a radiation forecast:
 *  - SEP: solar energetic particles are the radiation that actually reaches
 *    astronauts, so every SEP event counts as extreme (3).
 *  - FLR: NOAA's radio-blackout scale starts at M1; the game counts M5 and
 *    above (NOAA R2), X1 and above as severe (R3), X10 and above as extreme.
 *  - CME: DONKI's own speed types: O (1,000-1,999 km/s) strong,
 *    R (2,000-2,999) severe, ER (3,000 and above) extreme. Slower ones (S, C) are skipped.
 */
export const EVENT_RULES = {
  flareMinFlux: 5e-5,
  flareSevereFlux: 1e-4,
  flareExtremeFlux: 1e-3,
  cmeTypes: { O: 1, R: 2, ER: 3 } as Record<string, 1 | 2 | 3>,
};

const FLARE_BASE: Record<string, number> = { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 };

/** Peak X-ray flux in W/m² for a flare class such as "M5.2", or 0 if unreadable. */
export function flareFlux(classType: unknown): number {
  if (typeof classType !== 'string') return 0;
  const match = /^([ABCMX])(\d{1,2}(?:\.\d+)?)$/.exec(classType.trim().toUpperCase());
  return match ? FLARE_BASE[match[1]!]! * Number(match[2]) : 0;
}

const isTime = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) && !Number.isNaN(Date.parse(value));
const asList = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null) : []);
const str = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const iso = (value: string) => new Date(value).toISOString();

/** Turns raw DONKI lists into game events. Entries that cannot be read are skipped, never guessed. */
export function normalizeDonkiEvents(flares: unknown, cmes: unknown, seps: unknown): SpaceEvent[] {
  const events: SpaceEvent[] = [];

  for (const flare of asList(flares)) {
    const id = str(flare.flrID);
    const time = flare.peakTime ?? flare.beginTime;
    const flux = flareFlux(flare.classType);
    if (!id || !isTime(time) || flux < EVENT_RULES.flareMinFlux) continue;
    const severity = flux >= EVENT_RULES.flareExtremeFlux ? 3 : flux >= EVENT_RULES.flareSevereFlux ? 2 : 1;
    events.push({ id, type: 'FLR', time: iso(time), severity, detail: `class ${String(flare.classType).trim().toUpperCase()}`, link: str(flare.link) });
  }

  for (const cme of asList(cmes)) {
    const id = str(cme.activityID);
    if (!id || !isTime(cme.startTime)) continue;
    // Use the analysis DONKI marks as most accurate; skip CMEs without one.
    const best = asList(cme.cmeAnalyses).find((analysis) => analysis.isMostAccurate === true);
    const type = str(best?.type);
    const speed = typeof best?.speed === 'number' && Number.isFinite(best.speed) ? best.speed : null;
    const severity = type ? EVENT_RULES.cmeTypes[type.toUpperCase()] : undefined;
    if (!best || !severity || speed === null) continue;
    events.push({ id, type: 'CME', time: iso(cme.startTime), severity, detail: `${Math.round(speed).toLocaleString('en')} km/s`, link: str(cme.link) ?? str(best.link) });
  }

  for (const sep of asList(seps)) {
    const id = str(sep.sepID);
    if (!id || !isTime(sep.eventTime)) continue;
    events.push({ id, type: 'SEP', time: iso(sep.eventTime), severity: 3, detail: 'solar energetic particles', link: str(sep.link) });
  }

  // One entry per id, newest first.
  const unique = new Map(events.map((event) => [event.id, event]));
  return [...unique.values()].sort((a, b) => b.time.localeCompare(a.time));
}

// ---------------------------------------------------------------- fetching

const TYPES: DonkiType[] = ['FLR', 'CME', 'SEP'];
const day = (date: Date) => date.toISOString().slice(0, 10);

async function getJson(url: string, fetcher: typeof fetch): Promise<unknown> {
  const response = await fetcher(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`answered ${response.status}`);
  // DONKI can send an empty body, not "[]", when there are no events.
  const text = (await response.text()).trim();
  return text ? JSON.parse(text) : [];
}

/** Fetches all three lists from one host. Any failure fails the whole host, so lists are never mixed. */
async function fetchFrom(host: 'nasa-api' | 'donki-ccmc', start: string, end: string, apiKey: string, fetcher: typeof fetch): Promise<unknown[]> {
  return Promise.all(
    TYPES.map((type) =>
      getJson(
        host === 'nasa-api'
          ? `${NASA_URL}/${type}?startDate=${start}&endDate=${end}&api_key=${encodeURIComponent(apiKey)}`
          : `${CCMC_URL}/${type}?startDate=${start}&endDate=${end}${type === 'CME' ? '&mostAccurateOnly=true' : ''}`,
        fetcher,
      ),
    ),
  );
}

let cache: { feed: SpaceEventFeed; at: number } | null = null;

/** For tests. */
export function clearSpaceEventCache(): void {
  cache = null;
}

export async function loadSpaceEvents(fetcher: typeof fetch = fetch, now: () => number = Date.now): Promise<SpaceEventFeed | null> {
  if (cache && now() - cache.at < FRESH_MS) return cache.feed;

  const end = new Date(now());
  const start = new Date(now() - PERIOD_DAYS * DAY_MS);
  const apiKey = process.env.NASA_API_KEY?.trim();
  const hosts: ('nasa-api' | 'donki-ccmc')[] = apiKey ? ['nasa-api', 'donki-ccmc'] : ['donki-ccmc'];

  for (const host of hosts) {
    try {
      const [flares, cmes, seps] = await fetchFrom(host, day(start), day(end), apiKey ?? '', fetcher);
      const feed: SpaceEventFeed = { events: normalizeDonkiEvents(flares, cmes, seps), source: host, fetchedAt: end.toISOString(), periodStart: start.toISOString(), periodEnd: end.toISOString() };
      cache = { feed, at: now() };
      return feed;
    } catch (error) {
      console.warn(`DONKI from ${host} failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
  if (cache && now() - cache.at < STALE_MS) return { ...cache.feed, source: 'cache' };
  return null;
}

export async function GET(): Promise<Response> {
  const feed = await loadSpaceEvents();
  if (!feed) {
    return new Response(JSON.stringify({ error: 'nasa_unavailable' }), { status: 502, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }
  return new Response(JSON.stringify(feed), {
    status: 200,
    // Shared cache for 30 minutes; space weather does not change by the second.
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
  });
}
