import { useEffect, useState } from 'react';
import type { SpaceEvent, SpaceEventFeed } from '../../api/space-events';
import { SPACE_EVENTS_ARCHIVE } from './spaceEventsArchive';

export type { SpaceEvent, SpaceEventFeed };

const TYPES = new Set(['FLR', 'CME', 'SEP']);
const SOURCES = new Set(['nasa-api', 'donki-ccmc', 'cache', 'archive']);

function isEvent(value: unknown): value is SpaceEvent {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.id === 'string' &&
    TYPES.has(event.type as string) &&
    typeof event.time === 'string' &&
    !Number.isNaN(Date.parse(event.time)) &&
    (event.severity === 1 || event.severity === 2 || event.severity === 3) &&
    typeof event.detail === 'string' &&
    (event.link === null || typeof event.link === 'string')
  );
}

/** Checks a feed from the server before trusting it. Bad events are dropped; a bad feed returns null. */
export function validateFeed(raw: unknown): SpaceEventFeed | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const feed = raw as Record<string, unknown>;
  if (!Array.isArray(feed.events) || !SOURCES.has(feed.source as string) || typeof feed.fetchedAt !== 'string') return null;
  return {
    events: feed.events.filter(isEvent),
    source: feed.source as SpaceEventFeed['source'],
    fetchedAt: feed.fetchedAt,
    periodStart: typeof feed.periodStart === 'string' ? feed.periodStart : feed.fetchedAt,
    periodEnd: typeof feed.periodEnd === 'string' ? feed.periodEnd : feed.fetchedAt,
  };
}

/**
 * Gets recent real events from the app's server, or the bundled archive of
 * real past events if the server cannot be reached or sends something odd.
 * It never throws, so the game always has events to work with.
 */
export async function fetchSpaceEvents(fetcher: typeof fetch = (...args) => fetch(...args)): Promise<SpaceEventFeed> {
  try {
    const response = await fetcher('/api/space-events', { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return SPACE_EVENTS_ARCHIVE;
    return validateFeed(await response.json()) ?? SPACE_EVENTS_ARCHIVE;
  } catch {
    return SPACE_EVENTS_ARCHIVE;
  }
}

/** The real event a new storm is based on, and where it came from. */
export interface StormEventChoice {
  event: SpaceEvent;
  /** True when the event came from the live feed; false for the bundled archive. */
  live: boolean;
}

/**
 * Picks the event for the next radiation storm: the strongest one not used
 * yet, newest first among equals. Live events come first; when they run
 * out, the archive of real past events takes over.
 */
export function nextStormEvent(feed: SpaceEventFeed, used: readonly string[], archive: SpaceEventFeed = SPACE_EVENTS_ARCHIVE): StormEventChoice | null {
  const pick = (events: SpaceEvent[]) => events.filter((event) => !used.includes(event.id)).sort((a, b) => b.severity - a.severity || b.time.localeCompare(a.time))[0];
  const live = feed.source === 'archive' ? undefined : pick(feed.events);
  if (live) return { event: live, live: true };
  const saved = pick(archive.events);
  return saved ? { event: saved, live: false } : null;
}

const REFRESH_MS = 30 * 60 * 1000;
let shared: { at: number; feed: Promise<SpaceEventFeed> } | null = null;

/** One request shared by the whole app, reused for half an hour. */
function sharedFeed(): Promise<SpaceEventFeed> {
  if (!shared || Date.now() - shared.at > REFRESH_MS) shared = { at: Date.now(), feed: fetchSpaceEvents() };
  return shared.feed;
}

/** Loads the feed when the game opens, and refreshes it every half hour. */
export function useSpaceEvents(): SpaceEventFeed | null {
  const [feed, setFeed] = useState<SpaceEventFeed | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = () => sharedFeed().then((next) => !cancelled && setFeed(next));
    void load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
  return feed;
}

const TYPE_NAMES: Record<SpaceEvent['type'], string> = {
  FLR: 'a solar flare',
  CME: 'a coronal mass ejection (a giant cloud of gas thrown out by the Sun)',
  SEP: 'a solar particle storm',
};

/** "a solar flare (class X8.7)". */
export const describeEvent = (event: SpaceEvent) => (event.type === 'SEP' ? TYPE_NAMES.SEP : `${TYPE_NAMES[event.type]} (${event.detail})`);

/** "14 May 2024", in UTC so the date matches NASA's records. */
export const eventDate = (event: SpaceEvent) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(event.time));
