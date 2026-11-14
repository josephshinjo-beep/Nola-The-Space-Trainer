import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSpaceEventCache, flareFlux, GET, loadSpaceEvents, normalizeDonkiEvents, type SpaceEventFeed } from '../../api/space-events';
import { describeEvent, eventDate, fetchSpaceEvents, nextStormEvent, validateFeed } from './spaceEvents';
import { SPACE_EVENTS_ARCHIVE } from './spaceEventsArchive';

// Real DONKI answers recorded from NASA (see __fixtures__/donki/README.md).
import recentCME from './__fixtures__/donki/recent-CME.json';
import recentFLR from './__fixtures__/donki/recent-FLR.json';
import recentSEP from './__fixtures__/donki/recent-SEP.json';
import may2024CME from './__fixtures__/donki/may2024-CME.json';
import may2024FLR from './__fixtures__/donki/may2024-FLR.json';
import may2024SEP from './__fixtures__/donki/may2024-SEP.json';
import oct2024CME from './__fixtures__/donki/oct2024-CME.json';
import oct2024FLR from './__fixtures__/donki/oct2024-FLR.json';
import oct2024SEP from './__fixtures__/donki/oct2024-SEP.json';
import sep2017CME from './__fixtures__/donki/sep2017-CME.json';
import sep2017FLR from './__fixtures__/donki/sep2017-FLR.json';
import sep2017SEP from './__fixtures__/donki/sep2017-SEP.json';

const sep2017 = normalizeDonkiEvents(sep2017FLR, sep2017CME, sep2017SEP);
const find = (id: string) => sep2017.find((event) => event.id === id);

describe('reading real DONKI data', () => {
  it('reads flare classes as peak X-ray flux', () => {
    expect(flareFlux('M5.5')).toBeCloseTo(5.5e-5);
    expect(flareFlux('X9.3')).toBeCloseTo(9.3e-4);
    expect(flareFlux('x1.0')).toBeCloseTo(1e-4);
    for (const bad of [null, 7, '', 'Z1.0', 'M', 'M1.2.3']) expect(flareFlux(bad)).toBe(0);
  });

  it('turns the real September 2017 storm into the expected game events', () => {
    // The X9.3 flare of 6 September 2017, one of the largest of that solar cycle.
    expect(find('2017-09-06T11:53:00-FLR-001')).toMatchObject({ type: 'FLR', severity: 2, detail: 'class X9.3' });
    // M5.5 counts; M1.2 is below the game's M5 threshold.
    expect(find('2017-09-04T20:15:00-FLR-001')).toMatchObject({ severity: 1, detail: 'class M5.5' });
    expect(find('2017-09-04T05:36:00-FLR-001')).toBeUndefined();
    // A fast CME uses the analysis DONKI marks as most accurate; slow CMEs are skipped.
    expect(find('2017-09-04T20:36:00-CME-001')).toMatchObject({ type: 'CME', severity: 1, detail: '1,114 km/s' });
    expect(find('2017-09-04T19:39:00-CME-001')).toBeUndefined();
    expect(find('2017-09-06T10:00:00-CME-001')).toBeUndefined();
    // Every SEP event is extreme for the game.
    expect(find('2017-09-04T22:56:00-SEP-001')).toMatchObject({ type: 'SEP', severity: 3 });
  });

  it('gives the expected counts for each recorded period, newest first, with no duplicates', () => {
    const periods = [
      [normalizeDonkiEvents(recentFLR, recentCME, recentSEP), 1],
      [normalizeDonkiEvents(may2024FLR, may2024CME, may2024SEP), 42],
      [normalizeDonkiEvents(oct2024FLR, oct2024CME, oct2024SEP), 23],
      [sep2017, 19],
    ] as const;
    for (const [events, count] of periods) {
      expect(events).toHaveLength(count);
      expect(new Set(events.map((event) => event.id)).size).toBe(count);
      expect(events.map((event) => event.time)).toEqual([...events.map((event) => event.time)].sort().reverse());
    }
  });

  it('skips entries it cannot read, and never guesses', () => {
    const flares = [{ flrID: 'a', classType: 'X2.0' }, { flrID: 'b', peakTime: '2024-05-01T00:00Z', classType: 'big' }, { peakTime: '2024-05-01T00:00Z', classType: 'X2.0' }, 'junk', null];
    const cmes = [
      { activityID: 'c', startTime: '2024-05-01T00:00Z', cmeAnalyses: [{ type: 'R', speed: 2500, isMostAccurate: false }] },
      { activityID: 'd', startTime: '2024-05-01T00:00Z', cmeAnalyses: [{ type: 'R', isMostAccurate: true }] },
      { activityID: 'e', startTime: 'yesterday', cmeAnalyses: [{ type: 'R', speed: 2500, isMostAccurate: true }] },
      { activityID: 'f', startTime: '2024-05-01T00:00Z', cmeAnalyses: null },
    ];
    const seps = [{ sepID: 'g' }, { eventTime: '2024-05-01T00:00Z' }];
    expect(normalizeDonkiEvents(flares, cmes, seps)).toEqual([]);
    expect(normalizeDonkiEvents(undefined, { not: 'a list' }, 'text')).toEqual([]);
  });

  it('keeps the bundled archive exactly equal to the recorded real data', () => {
    const fromFixtures = [
      ...normalizeDonkiEvents(may2024FLR, may2024CME, may2024SEP),
      ...normalizeDonkiEvents(oct2024FLR, oct2024CME, oct2024SEP),
      ...sep2017,
    ].sort((a, b) => b.time.localeCompare(a.time));
    expect(SPACE_EVENTS_ARCHIVE.events).toEqual(fromFixtures);
    expect(SPACE_EVENTS_ARCHIVE.source).toBe('archive');
  });
});

describe('the /api/space-events route', () => {
  const NOW = Date.parse('2026-11-14T12:00:00Z');
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  const realAnswer = (url: string) => json(url.includes('/FLR') ? sep2017FLR : url.includes('/CME') ? sep2017CME : sep2017SEP);

  beforeEach(() => {
    clearSpaceEventCache();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('uses the official DONKI web service when there is no NASA key', async () => {
    vi.stubEnv('NASA_API_KEY', '');
    const urls: string[] = [];
    const fetcher = vi.fn(async (url: string | URL | Request) => (urls.push(String(url)), realAnswer(String(url)))) as unknown as typeof fetch;
    const feed = await loadSpaceEvents(fetcher, () => NOW);
    expect(feed?.source).toBe('donki-ccmc');
    expect(feed?.events).toHaveLength(19);
    expect(urls).toEqual([
      'https://ccmc.gsfc.nasa.gov/DONKI-API/get/FLR?startDate=2026-10-15&endDate=2026-11-14',
      'https://ccmc.gsfc.nasa.gov/DONKI-API/get/CME?startDate=2026-10-15&endDate=2026-11-14&mostAccurateOnly=true',
      'https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=2026-10-15&endDate=2026-11-14',
    ]);
  });

  it('tries api.nasa.gov first with a key, then falls back to DONKI', async () => {
    vi.stubEnv('NASA_API_KEY', 'secret-key');
    const urls: string[] = [];
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      urls.push(String(url));
      return String(url).includes('api.nasa.gov') ? new Response('slow down', { status: 429 }) : realAnswer(String(url));
    }) as unknown as typeof fetch;
    const feed = await loadSpaceEvents(fetcher, () => NOW);
    expect(urls[0]).toBe('https://api.nasa.gov/DONKI/FLR?startDate=2026-10-15&endDate=2026-11-14&api_key=secret-key');
    expect(feed?.source).toBe('donki-ccmc');
    // The key is never part of what the browser receives.
    expect(JSON.stringify(feed)).not.toContain('secret-key');
  });

  it('reads an empty answer as "no events"', async () => {
    vi.stubEnv('NASA_API_KEY', '');
    const feed = await loadSpaceEvents((async () => new Response('', { status: 200 })) as typeof fetch, () => NOW);
    expect(feed).toMatchObject({ events: [], source: 'donki-ccmc' });
  });

  it('caches for 30 minutes, then serves a stale copy for up to a day if NASA is down', async () => {
    vi.stubEnv('NASA_API_KEY', '');
    let up = true;
    const fetcher = vi.fn(async (url: string | URL | Request) => (up ? realAnswer(String(url)) : new Response('', { status: 503 }))) as unknown as typeof fetch;
    await loadSpaceEvents(fetcher, () => NOW);
    expect(fetcher).toHaveBeenCalledTimes(3);
    await loadSpaceEvents(fetcher, () => NOW + 10 * 60 * 1000);
    expect(fetcher).toHaveBeenCalledTimes(3);
    up = false;
    expect((await loadSpaceEvents(fetcher, () => NOW + 60 * 60 * 1000))?.source).toBe('cache');
    expect(await loadSpaceEvents(fetcher, () => NOW + 25 * 60 * 60 * 1000)).toBeNull();
  });

  it('answers 502 when nothing works, so the app uses its archive', async () => {
    vi.stubEnv('NASA_API_KEY', '');
    vi.stubGlobal('fetch', async () => {
      throw new Error('offline');
    });
    const response = await GET();
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'nasa_unavailable' });
    vi.unstubAllGlobals();
  });
});

describe('the app side', () => {
  const live: SpaceEventFeed = {
    source: 'donki-ccmc',
    fetchedAt: '2026-11-14T00:00:00.000Z',
    periodStart: '2026-10-15T00:00:00.000Z',
    periodEnd: '2026-11-14T00:00:00.000Z',
    events: [
      { id: 'a', type: 'CME', time: '2026-11-10T00:00:00.000Z', severity: 1, detail: '1,048 km/s', link: null },
      { id: 'b', type: 'FLR', time: '2026-11-01T00:00:00.000Z', severity: 2, detail: 'class X1.2', link: null },
      { id: 'c', type: 'FLR', time: '2026-11-05T00:00:00.000Z', severity: 2, detail: 'class X1.0', link: null },
    ],
  };

  it('checks feeds before trusting them', () => {
    expect(validateFeed(null)).toBeNull();
    expect(validateFeed({ events: [], source: 'mystery', fetchedAt: 'x' })).toBeNull();
    const checked = validateFeed({ ...live, events: [...live.events, { id: 'bad', type: 'FLR', time: 'never', severity: 2, detail: '', link: null }, { id: 'x', type: 'GST' }] });
    expect(checked?.events).toHaveLength(3);
  });

  it('falls back to the archive whenever the server cannot help, and never throws', async () => {
    const answers: (() => Promise<Response>)[] = [
      async () => new Response('{"error":"nasa_unavailable"}', { status: 502, headers: { 'content-type': 'application/json' } }),
      async () => new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } }),
      async () => new Response('{"events":"no"}', { status: 200, headers: { 'content-type': 'application/json' } }),
      async () => {
        throw new TypeError('offline');
      },
    ];
    for (const answer of answers) expect(await fetchSpaceEvents(answer as unknown as typeof fetch)).toBe(SPACE_EVENTS_ARCHIVE);
    const good = await fetchSpaceEvents((async () => new Response(JSON.stringify(live), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch);
    expect(good.source).toBe('donki-ccmc');
  });

  it('picks the strongest unused live event, newest first, then the archive', () => {
    expect(nextStormEvent(live, [])).toEqual({ event: live.events[2], live: true });
    expect(nextStormEvent(live, ['c'])?.event.id).toBe('b');
    expect(nextStormEvent(live, ['a', 'b', 'c'])).toMatchObject({ live: false, event: { severity: 3 } });
    expect(nextStormEvent(SPACE_EVENTS_ARCHIVE, [])?.live).toBe(false);
    const allIds = [...live.events, ...SPACE_EVENTS_ARCHIVE.events].map((event) => event.id);
    expect(nextStormEvent(live, allIds)).toBeNull();
  });

  it('words events for children, with the date as NASA records it (UTC)', () => {
    expect(describeEvent(live.events[1]!)).toBe('a solar flare (class X1.2)');
    expect(describeEvent({ ...live.events[0]!, type: 'SEP' })).toBe('a solar particle storm');
    expect(eventDate({ ...live.events[0]!, time: '2024-05-14T23:59:00.000Z' })).toBe('14 May 2024');
  });
});
