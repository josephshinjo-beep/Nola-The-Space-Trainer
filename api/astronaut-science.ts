/**
 * Checks the astronaut-health studies the game quotes against NASA's Open
 * Science Data Repository (OSDR), live.
 *
 * For each study it asks the public OSDR study search API (no key needed):
 *   https://osdr.nasa.gov/osdr/data/search?term=OSD-342&type=cgene&size=5
 * and returns the study's current title, publication and authors, plus
 * whether each sentence the game quotes still appears in the study's
 * description. The game's own text and its saved copy of every citation
 * live in src/data/astronautScience.ts, so the cards still work (with
 * their citations) if OSDR cannot be reached.
 */

export const maxDuration = 20;

const SEARCH_URL = 'https://osdr.nasa.gov/osdr/data/search';
const FRESH_MS = 24 * 60 * 60 * 1000;

/** The OSDR studies the game quotes, and the exact sentences it quotes from each. */
export const QUOTED: Record<string, string[]> = {
  'OSD-342': ['Wild type mice lost significant muscle and bone mass during the 33 d spent in microgravity.'],
  'OSD-417': ['Along with BMD loss, ELISA analysis reveals increases of osteocalcin and reductions in tartrate-resistant acid phosphatase 5b signifying additional loss of bone homeostasis in flight.'],
  'OSD-942': ['Exercise training during the National Aeronautics and Space Administration 70-d bed rest study effectively counteracted the decline in aerobic capacity, muscle mass, strength, and endurance.'],
  'OSD-51': ['Exercise countermeasure demonstrated a drastic compensatory effect, decreasing the number of differentially-expressed genes by 89 and 96% in SOL and VL.'],
  'OSD-540': ['QF CSA and MVC decreased with ULLS.', 'The AR period restored most of these neuromuscular alterations.'],
  'OSD-343': ['Additional pathways altered in spaceflight included cell cycle, circadian rhythm, and olfactory activity pathways, all of which are known to have interactions with mitochondrial activity.'],
  'OSD-479': ['males displayed impaired spatial learning, whereas females did not.'],
  'OSD-984': ['We investigated protein abundance changes 9-months after recovery from combined unloading and radiation exposure.'],
};

export interface LiveStudy {
  accession: string;
  studyTitle: string;
  publicationTitle: string | null;
  authors: string | null;
  organism: string | null;
  /** True when every quoted sentence was found in OSDR's current description. */
  quotesFound: boolean;
}

export interface ScienceCheck {
  source: 'osdr-live' | 'cache';
  fetchedAt: string;
  studies: Record<string, LiveStudy>;
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.replace(/\s+/g, ' ').trim() : null);

/** Reads one study out of an OSDR search answer. Returns null if it is not there or cannot be read. */
export function readStudy(raw: unknown, accession: string): LiveStudy | null {
  const hits = (raw as { hits?: { hits?: unknown } } | null)?.hits?.hits;
  if (!Array.isArray(hits)) return null;
  for (const hit of hits) {
    const source = (hit as { _source?: Record<string, unknown> } | null)?._source;
    if (!source || source.Accession !== accession) continue;
    const studyTitle = text(source['Study Title']);
    const description = text(source['Study Description']);
    if (!studyTitle || !description) return null;
    return {
      accession,
      studyTitle,
      publicationTitle: text(source['Study Publication Title']),
      authors: text(source['Study Publication Author List']),
      organism: text(source.organism),
      quotesFound: (QUOTED[accession] ?? []).every((quote) => description.includes(quote)),
    };
  }
  return null;
}

let cache: { check: ScienceCheck; at: number } | null = null;

/** For tests. */
export function clearScienceCache(): void {
  cache = null;
}

export async function checkStudies(fetcher: typeof fetch = fetch, now: () => number = Date.now): Promise<ScienceCheck | null> {
  if (cache && now() - cache.at < FRESH_MS) return cache.check;
  const accessions = Object.keys(QUOTED);
  const results = await Promise.all(
    accessions.map(async (accession) => {
      try {
        const response = await fetcher(`${SEARCH_URL}?term=${encodeURIComponent(accession)}&type=cgene&size=5`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12_000) });
        if (!response.ok) throw new Error(`answered ${response.status}`);
        return readStudy(await response.json(), accession);
      } catch (error) {
        console.warn(`OSDR ${accession} failed: ${error instanceof Error ? error.message : 'unknown error'}`);
        return null;
      }
    }),
  );
  const studies = Object.fromEntries(results.filter((study): study is LiveStudy => study !== null).map((study) => [study.accession, study]));
  if (Object.keys(studies).length === 0) return cache ? { ...cache.check, source: 'cache' } : null;
  const check: ScienceCheck = { source: 'osdr-live', fetchedAt: new Date(now()).toISOString(), studies };
  cache = { check, at: now() };
  return check;
}

export async function GET(): Promise<Response> {
  const check = await checkStudies();
  if (!check) return new Response(JSON.stringify({ error: 'osdr_unavailable' }), { status: 502, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  return new Response(JSON.stringify(check), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' } });
}
