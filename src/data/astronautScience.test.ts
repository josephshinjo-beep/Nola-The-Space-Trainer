import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkStudies, clearScienceCache, GET, QUOTED, readStudy } from '../../api/astronaut-science';
import { scienceTopicFor } from '../game/sol/solFlow';
import type { LedgerEntry } from '../sol/types';
import { FINDINGS, fetchScienceCheck, pickFinding, validateCheck, withLiveCheck } from './astronautScience';

// Real OSDR answers recorded on 14 Nov 2026 (see __fixtures__/osdr/README.md).
const fixtures = import.meta.glob('./__fixtures__/osdr/OSD-*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const recorded = (accession: string) => fixtures[`./__fixtures__/osdr/${accession}.json`];
const description = (accession: string) => ((recorded(accession) as { hits: { hits: { _source: Record<string, string> }[] } }).hits.hits[0]!._source['Study Description'] ?? '').replace(/\s+/g, ' ');

describe('the saved findings', () => {
  it('cover muscle and bone, exercise, the body clock and radiation', () => {
    expect(new Set(FINDINGS.map((finding) => finding.topic))).toEqual(new Set(['muscle-bone', 'exercise', 'sleep', 'radiation']));
  });

  it('every finding cites a real OSDR study, with a working link format, title, publication and authors', () => {
    for (const finding of FINDINGS) {
      const { citation } = finding;
      expect(citation.accession).toMatch(/^OSD-\d+$/);
      expect(citation.url).toBe(`https://osdr.nasa.gov/bio/repo/data/studies/${citation.accession}`);
      expect(citation.studyTitle.length, finding.id).toBeGreaterThan(10);
      expect(citation.publicationTitle.length, finding.id).toBeGreaterThan(10);
      expect(citation.authors, finding.id).toMatch(/et al\.$/);
      expect(recorded(citation.accession), `fixture for ${citation.accession}`).toBeDefined();
    }
  });

  it('quotes every study word for word from its OSDR description', () => {
    for (const finding of FINDINGS) {
      expect(finding.quotes).toEqual(QUOTED[finding.citation.accession]);
      for (const quote of finding.quotes) expect(description(finding.citation.accession), `${finding.id}: ${quote}`).toContain(quote);
    }
  });

  it('says who was studied, so mouse and bed-rest studies are not mistaken for astronauts', () => {
    for (const finding of FINDINGS) expect(finding.subjects.length, finding.id).toBeGreaterThan(15);
    const organisms = (accession: string) => (recorded(accession) as { hits: { hits: { _source: { organism: string } }[] } }).hits.hits[0]!._source.organism;
    for (const finding of FINDINGS.filter((f) => organisms(f.citation.accession).includes('Mus musculus') && f.citation.accession !== 'OSD-343')) {
      expect(finding.subjects, finding.id).toMatch(/[Mm]ice/);
    }
  });
});

describe('the /api/astronaut-science route', () => {
  const answer = (url: string) => {
    const accession = /term=(OSD-\d+)/.exec(decodeURIComponent(url))?.[1] ?? '';
    return new Response(JSON.stringify(recorded(accession) ?? { hits: { hits: [] } }), { status: 200 });
  };
  beforeEach(() => {
    clearScienceCache();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('reads real OSDR answers and finds every quote', async () => {
    const urls: string[] = [];
    const check = await checkStudies((async (url: string | URL | Request) => (urls.push(String(url)), answer(String(url)))) as typeof fetch);
    expect(check?.source).toBe('osdr-live');
    expect(Object.keys(check!.studies).sort()).toEqual(Object.keys(QUOTED).sort());
    for (const study of Object.values(check!.studies)) expect(study.quotesFound, study.accession).toBe(true);
    expect(urls).toContain('https://osdr.nasa.gov/osdr/data/search?term=OSD-342&type=cgene&size=5');
  });

  it('notices when a quote is no longer in OSDR, and skips unreadable studies', () => {
    const real = recorded('OSD-479') as { hits: { hits: { _source: Record<string, unknown> }[] } };
    const changed = { hits: { hits: [{ _source: { ...real.hits.hits[0]!._source, 'Study Description': 'Rewritten.' } }] } };
    expect(readStudy(changed, 'OSD-479')?.quotesFound).toBe(false);
    expect(readStudy(real, 'OSD-342')).toBeNull();
    expect(readStudy({ hits: { hits: [{ _source: { Accession: 'OSD-479' } }] } }, 'OSD-479')).toBeNull();
    expect(readStudy('nonsense', 'OSD-479')).toBeNull();
  });

  it('keeps a day-long cache, falls back to it, and answers 502 when OSDR is down with nothing saved', async () => {
    let up = true;
    const spy = vi.fn(async (url: string | URL | Request) => (up ? answer(String(url)) : new Response('', { status: 503 })));
    const fetcher = spy as unknown as typeof fetch;
    await checkStudies(fetcher, () => 0);
    const calls = spy.mock.calls.length;
    await checkStudies(fetcher, () => 60 * 60 * 1000);
    expect(spy.mock.calls.length).toBe(calls);
    up = false;
    expect((await checkStudies(fetcher, () => 25 * 60 * 60 * 1000))?.source).toBe('cache');
    clearScienceCache();
    vi.stubGlobal('fetch', async () => {
      throw new Error('offline');
    });
    expect((await GET()).status).toBe(502);
    vi.unstubAllGlobals();
  });
});

describe('the app side', () => {
  it('shows saved citations when there is no live check, and marks checked ones', async () => {
    expect(withLiveCheck(null).every((card) => !card.checkedLive)).toBe(true);
    clearScienceCache();
    const check = await checkStudies((async (url: string | URL | Request) => {
      const accession = /term=(OSD-\d+)/.exec(decodeURIComponent(String(url)))?.[1] ?? '';
      return new Response(JSON.stringify(recorded(accession)), { status: 200 });
    }) as typeof fetch);
    const cards = withLiveCheck(check);
    expect(cards.every((card) => card.checkedLive)).toBe(true);
    // A study whose quote vanished falls back to the saved citation, marked as saved.
    const broken = { ...check!, studies: { ...check!.studies, 'OSD-479': { ...check!.studies['OSD-479']!, quotesFound: false } } };
    expect(withLiveCheck(broken).find((card) => card.citation.accession === 'OSD-479')?.checkedLive).toBe(false);
  });

  it('never throws when the server is unreachable or odd', async () => {
    expect(await fetchScienceCheck((async () => new Response('x', { status: 502 })) as typeof fetch)).toBeNull();
    expect(await fetchScienceCheck((async () => {
      throw new TypeError('offline');
    }) as typeof fetch)).toBeNull();
    expect(validateCheck({ source: 'osdr-live' })).toBeNull();
  });

  it('takes turns between findings on a topic', () => {
    const cards = withLiveCheck(null);
    const exercise = [0, 1, 2].map((turn) => pickFinding(cards, 'exercise', turn)?.id);
    expect(new Set(exercise).size).toBe(3);
    expect(pickFinding(cards, 'exercise', 3)?.id).toBe(exercise[0]);
  });
});

describe('which science explains a change in crew health', () => {
  const entry = (source: string, extra: Partial<LedgerEntry> = {}): LedgerEntry => ({ sol: 1, phase: 'night', source, label: source, gave: {}, cost: {}, ...extra });
  it('explains harm first, then help', () => {
    expect(scienceTopicFor([entry('system:fatigue'), entry('system:radiation')])).toBe('radiation');
    expect(scienceTopicFor([entry('storm:x', { label: 'Storm hits an unprotected crew', cost: { crewHealth: 8 } })])).toBe('radiation');
    expect(scienceTopicFor([entry('storm:x', { label: 'Storm passes while the crew shelters', cost: {} })])).toBeNull();
    expect(scienceTopicFor([entry('system:deconditioning')])).toBe('muscle-bone');
    expect(scienceTopicFor([entry('system:fatigue')])).toBe('sleep');
    expect(scienceTopicFor([entry('exercise', { phase: 'action', label: 'Do the workout: completed' })])).toBe('exercise');
    expect(scienceTopicFor([entry('exercise', { phase: 'action', label: 'Do the workout: failed' })])).toBeNull();
    expect(scienceTopicFor([entry('rest-day', { phase: 'action', label: 'Check-up: completed' })])).toBe('sleep');
    expect(scienceTopicFor([entry('system:life-support')])).toBeNull();
  });
});
