import { loadLesson } from '../academy/content';
import { CURRICULUM } from '../academy/curriculum';
import { SPACE_FACTS } from './spaceFacts';

/**
 * NOLA's knowledge base and the search over it (the "retrieval" part of
 * retrieval-augmented generation, or RAG).
 *
 * The knowledge base is built from the Academy's own lesson cards, so
 * NOLA's answers come from the same reviewed content the student studies,
 * plus a few entries about how the app works. Each answer can point back
 * to the lesson it came from.
 *
 * The search is a simple keyword match that runs in the browser. It needs
 * no extra service and works offline. It only ever READS text: it has no
 * connection to the simulation.
 */

export interface Passage {
  id: string;
  title: string;
  text: string;
  /** Extra search words that count like title words. */
  keywords?: string;
  /** Where the answer comes from. `to` is a page in the app to read more, when there is one. */
  source: { label: string; to?: string };
  /** Hand-written for students (lessons, NOLA's notes, app help). These are preferred over reference entries. */
  curated?: boolean;
}

const APP_HELP: Passage[] = [
  {
    id: 'help-unlock',
    title: 'How do I unlock rooms and systems on my station?',
    text: 'Each Academy module unlocks one part of your station. Finish the lesson, pass its knowledge check with at least 4 out of 5, and solve the mission challenge. Then the matching room opens in the game.',
    source: { label: 'NOLA Academy', to: '/academy' },
  },
  {
    id: 'help-move',
    title: 'How do I move and use things in the station game?',
    text: 'Move your astronaut with the WASD or arrow keys, or the joystick on a touch screen. Walk up to a machine and press E, or the Use button. You can also open the Map and choose a machine to go straight to it.',
    source: { label: 'NOLA Mission', to: '/mission' },
  },
  {
    id: 'help-pass',
    title: 'How do I pass a lesson or quiz?',
    text: 'You need 4 out of 5 correct in the knowledge check. If you miss, you can review the lesson and try again as many times as you like. Everyone retakes tests sometimes; that is how astronauts learn.',
    source: { label: 'NOLA Academy', to: '/academy' },
  },
  {
    id: 'help-storm',
    title: 'What should I do in a solar storm in the game?',
    text: 'Walk to the Radiation Shelter and stay inside until NOLA says the storm has passed. The shelter blocks most of the radiation and keeps your crew healthy.',
    source: { label: 'NOLA Mission', to: '/mission' },
  },
  {
    id: 'help-low',
    title: 'What do I do when oxygen, water, food or energy is low on my station?',
    text: 'Low oxygen: switch on the Oxygen Generator and fix the CO₂ Scrubber. Low water: run the Water Recycler and seal any leaks. Low food: plant and harvest crops. Low energy: deploy the solar panels, realign them if they drift, or turn on power saver.',
    source: { label: 'NOLA Mission', to: '/mission' },
  },
  {
    id: 'help-real',
    title: 'Is the station game real science?',
    text: 'The ideas are real: oxygen is made from water using electricity, water is recycled, panels only work in sunlight. But the numbers are simplified game values, and time is sped up so a station day lasts about 12 minutes.',
    source: { label: 'NOLA Mission', to: '/mission' },
  },
];

interface CorpusEntry {
  id: string;
  category: string;
  topic: string;
  entities: string[];
  text: string;
}

/**
 * Turns one entry of the space general-knowledge corpus into a passage.
 * Entries written as "Question: ... Answer: ..." are split so the question
 * becomes the title and only the answer is shown.
 */
export function corpusToPassage(entry: CorpusEntry): Passage {
  const qa = /^Question:\s*(.+?)\s*Answer:\s*([\s\S]+)$/.exec(entry.text);
  return {
    id: entry.id,
    title: qa ? qa[1]! : entry.topic,
    text: qa ? qa[2]! : entry.text,
    keywords: `${entry.topic} ${entry.entities.join(' ')}`,
    source: { label: `Space knowledge base: ${entry.category}` },
  };
}

let cache: Promise<Passage[]> | null = null;

/**
 * Builds the knowledge base: every lesson card, NOLA's space notes, the app
 * help, and the space general-knowledge corpus (corpus/space-gk.json).
 * Loaded once, on first use. If loading fails it is tried again next time.
 */
export function loadKnowledge(): Promise<Passage[]> {
  cache ??= Promise.all([
    Promise.all(
      CURRICULUM.map(async (module) => {
        const lesson = await loadLesson(module.id);
        return lesson.cards.map(
          (card, index): Passage => ({
            id: `${module.id}-${index}`,
            title: card.title,
            text: card.fact ? `${card.text} ${card.fact.text}` : card.text,
            keywords: card.keywords,
            source: { label: `Module ${module.number}: ${module.title}`, to: `/academy/${module.id}` },
            curated: true,
          }),
        );
      }),
    ),
    import('./corpus/space-gk.json').then((file) => (file.default as CorpusEntry[]).map(corpusToPassage)),
  ])
    .then(([lessons, corpus]) => [...lessons.flat(), ...[...SPACE_FACTS, ...APP_HELP].map((passage) => ({ ...passage, curated: true })), ...corpus])
    .catch((error) => {
      cache = null;
      throw error;
    });
  return cache;
}

const STOP_WORDS = new Set(
  'a an the and or but if so of to in on at by for from with about into over is are was were be been being am do does did done have has had can could would should will shall may might must i me my you your we our they them their it its this that these those there here what which who whom whose when where why how not no yes as than then too very just also get got make made thing things please tell explain know want need like some any does work works'.split(' '),
);

/** Reduces a word to a rough root so "recycling", "recycled" and "recycle" all match. */
function stem(word: string): string {
  let root = word;
  for (const ending of ['ing', 'ed', 'es', 's']) {
    if (root.length > ending.length + 2 && root.endsWith(ending)) {
      root = root.slice(0, -ending.length);
      break;
    }
  }
  return root.endsWith('e') && root.length > 3 ? root.slice(0, -1) : root;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/co₂|co2/g, ' carbon dioxide ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
    .map(stem);
}

export interface SearchHit {
  passage: Passage;
  score: number;
}

/** A word found in more than this share of all passages ("space", "Earth") cannot carry a match on its own. */
const COMMON_SHARE = 0.12;

interface Scored extends SearchHit {
  /** True when the match is good enough to be given as the answer. */
  confident: boolean;
  /** True when the question shares a title or keyword word with the passage: worth suggesting. */
  related: boolean;
}

interface IndexedPassage {
  passage: Passage;
  title: Set<string>;
  keywords: Set<string>;
  text: string[];
  /** Every word of the passage, for quick "does it contain this?" checks. */
  all: Set<string>;
}

/** The word index is built once per knowledge base, not on every question. */
const indexCache = new WeakMap<readonly Passage[], IndexedPassage[]>();

function indexOf(passages: readonly Passage[]): IndexedPassage[] {
  let indexed = indexCache.get(passages);
  if (!indexed) {
    indexed = passages.map((passage) => {
      const title = new Set(tokenize(passage.title));
      const keywords = new Set(tokenize(passage.keywords ?? ''));
      const text = tokenize(passage.text);
      return { passage, title, keywords, text, all: new Set([...title, ...keywords, ...text]) };
    });
    indexCache.set(passages, indexed);
  }
  return indexed;
}

/** Hand-written passages win over reference entries that match about equally well. */
const CURATED_BOOST = 1.8;

function scoreAll(passages: readonly Passage[], question: string): Scored[] {
  const queryTokens = [...new Set(tokenize(question))];
  if (queryTokens.length === 0) return [];

  const indexed = indexOf(passages);
  const spread = new Map<string, number>();
  for (const token of queryTokens) {
    spread.set(token, indexed.filter((entry) => entry.all.has(token)).length);
  }
  // Squared so that words found in many passages count for very little.
  const rarity = (token: string) => {
    const containing = spread.get(token) ?? 0;
    return containing === 0 ? 0 : Math.log(1 + passages.length / containing) ** 2;
  };
  const isCommon = (token: string) => (spread.get(token) ?? 0) / passages.length > COMMON_SHARE;

  const scored: Scored[] = [];
  for (const entry of indexed) {
    let score = 0;
    let matched = 0;
    let titleMatches = 0;
    let keyHit = false;
    let distinctive = false;
    for (const token of queryTokens) {
      const inTitle = entry.title.has(token) || entry.keywords.has(token);
      if (!entry.all.has(token)) continue;
      const count = entry.text.filter((word) => word === token).length;
      matched += 1;
      if (entry.title.has(token) || entry.keywords.has(token)) titleMatches += 1;
      keyHit ||= inTitle;
      distinctive ||= !isCommon(token);
      score += rarity(token) * ((inTitle ? 2.5 : 0) + (count > 0 ? 1 + Math.log(count) : 0));
    }
    if (score <= 0) continue;
    const coverage = matched / queryTokens.length;
    // A title made up mostly of the question's words is a strong sign of the right passage.
    // Keyword hits count like title hits, so a card tagged with the question's words can win.
    const titleCoverage = entry.title.size > 0 ? Math.min(1, titleMatches / entry.title.size) : 0;
    // Confident only if enough of the question matched AND the match rests on a
    // telling word, not just on everyday ones such as "Earth" or "space".
    // More than half the question must match. Exactly half is enough only for a
    // longer question that also hits the passage's title or keywords.
    const enough = coverage > 0.5 || (keyHit && coverage >= 0.5 && queryTokens.length >= 4);
    const confident = enough && (distinctive || (titleCoverage >= 0.6 && coverage >= 0.75));
    scored.push({
      passage: entry.passage,
      score: score * (0.5 + coverage) * (1 + titleCoverage) * (entry.passage.curated ? CURATED_BOOST : 1),
      confident,
      related: keyHit && coverage >= 0.34,
    });
  }
  return scored.sort((x, y) => y.score - x.score);
}

/**
 * Finds the passages that answer a question. Returns nothing when no
 * passage is a confident match; NOLA then says so instead of guessing.
 */
export function searchKnowledge(passages: readonly Passage[], question: string, limit = 3): SearchHit[] {
  return scoreAll(passages, question)
    .filter((hit) => hit.confident)
    .slice(0, limit)
    .map(({ passage, score }) => ({ passage, score }));
}

/** Questions NOLA can answer that are near the one asked, for "did you mean" suggestions. */
export function suggestQuestions(passages: readonly Passage[], question: string, limit = 3): string[] {
  return scoreAll(passages, question)
    .filter((hit) => hit.related)
    .slice(0, limit)
    .map((hit) => hit.passage.title);
}
