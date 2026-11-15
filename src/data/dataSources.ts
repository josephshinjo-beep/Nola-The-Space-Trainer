import { DECISION_AMOUNTS, SOL_CONFIG, type Param } from '../sol/config';
import scienceSaved from './astronautScience.json';

/**
 * Everything the "Data sources" page lists: each NASA dataset or reference
 * the app uses, and every number in the sol engine marked real (NASA-based)
 * or simplified (a game value). The number list is read straight from the
 * config, so the page can never fall out of step with the game.
 */

export type Access = 'Live, with a saved copy as backup' | 'Live (optional), simulated otherwise' | 'Built-in reference values';

export interface DataSource {
  id: string;
  name: string;
  provider: string;
  /** What it is, in plain words. */
  what: string;
  /** Where the app uses it. */
  usedFor: string;
  access: Access;
  /** API endpoints the app calls, exactly. */
  endpoints: string[];
  link: string;
  /** Files in this project that use it. */
  files: string[];
}

export const DATA_SOURCES: DataSource[] = [
  {
    id: 'donki-events',
    name: 'DONKI: solar flares, coronal mass ejections and solar particle events',
    provider: 'NASA Community Coordinated Modeling Center (CCMC)',
    what: 'NASA’s Space Weather Database Of Notifications, Knowledge, Information. It records real solar events as scientists confirm them.',
    usedFor: 'Radiation Storm warnings in the station game. Each storm is based on a real event, with its real date and type on screen.',
    access: 'Live, with a saved copy as backup',
    endpoints: ['https://api.nasa.gov/DONKI/{FLR,CME,SEP}?startDate=…&endDate=…&api_key=… (when NASA_API_KEY is set)', 'https://ccmc.gsfc.nasa.gov/DONKI-API/get/{FLR,CME,SEP}?startDate=…&endDate=… (no key)'],
    link: 'https://ccmc.gsfc.nasa.gov/DONKI/',
    files: ['api/space-events.ts', 'src/data/spaceEventsArchive.ts', 'src/data/__fixtures__/donki/'],
  },
  {
    id: 'donki-summary',
    name: 'DONKI: space-weather summary (flares, geomagnetic storms, particle events)',
    provider: 'NASA (api.nasa.gov)',
    what: 'The strongest recent solar flare, the highest Kp index and the number of particle events over the past week.',
    usedFor: 'The space-weather reading at the Radiation Monitor, and how often the station’s own solar storms happen. Off unless VITE_SPACE_DATA_SOURCE=nasa; otherwise clearly labelled simulated data is used.',
    access: 'Live (optional), simulated otherwise',
    endpoints: ['https://api.nasa.gov/DONKI/{FLR,GST,SEP}?startDate=…&endDate=…&api_key=…'],
    link: 'https://api.nasa.gov/',
    files: ['api/space-weather.ts', 'src/data/providers.ts'],
  },
  {
    id: 'osdr',
    name: 'Open Science Data Repository (OSDR): astronaut and spaceflight health studies',
    provider: 'NASA Space Biology / GeneLab',
    what: `NASA’s public library of spaceflight biology studies. The app quotes ${scienceSaved.findings.length} studies about muscle and bone, exercise, the body clock and radiation.`,
    usedFor: 'Astronaut Science cards when crew health changes. Every card says who was studied and cites the study with a link.',
    access: 'Live, with a saved copy as backup',
    endpoints: ['https://osdr.nasa.gov/osdr/data/search?term=OSD-…&type=cgene&size=5'],
    link: 'https://osdr.nasa.gov/bio/',
    files: ['api/astronaut-science.ts', 'src/data/astronautScience.json', 'src/data/__fixtures__/osdr/'],
  },
  {
    id: 'jpl-elements',
    name: 'Keplerian elements for approximate positions of the major planets',
    provider: 'NASA Jet Propulsion Laboratory (E. M. Standish)',
    what: 'Published formulas for where Earth and Mars are on any date between 1800 and 2050.',
    usedFor: 'Today’s real Earth–Mars distance, which sets the radio delay for a Mars base (3 to 22 minutes each way).',
    access: 'Built-in reference values',
    endpoints: [],
    link: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html',
    files: ['src/game/comms/delay.ts'],
  },
  {
    id: 'bvad',
    name: 'Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570',
    provider: 'NASA',
    what: 'NASA’s reference numbers for designing life support: how much oxygen, water and food a person uses each day.',
    usedFor: 'Daily oxygen, water and food use in the sol engine, and the life-support calculator in Ask NOLA.',
    access: 'Built-in reference values',
    endpoints: [],
    link: 'https://ntrs.nasa.gov/search?q=%22NASA%2FTP-2015-218570%22',
    files: ['src/sol/config.ts', 'src/features/companion/calculator.ts'],
  },
  {
    id: 'fact-sheets',
    name: 'NASA Planetary, Mars and Moon Fact Sheets',
    provider: 'NASA Goddard Space Flight Center',
    what: 'Official figures for each planet: gravity, length of day and year, distance from Earth.',
    usedFor: 'The length of a sol, the Moon’s distance (1.3-second radio delay), and Ask NOLA’s calculators for weight, age and travel on other worlds.',
    access: 'Built-in reference values',
    endpoints: [],
    link: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/',
    files: ['src/sol/config.ts', 'src/game/comms/delay.ts', 'src/features/companion/calculator.ts'],
  },
  {
    id: 'curiosity-rad',
    name: 'Curiosity rover’s Radiation Assessment Detector (RAD)',
    provider: 'NASA / JPL (Hassler et al., Science, 2014)',
    what: 'The first measurements of radiation on the surface of Mars.',
    usedFor: 'The everyday radiation dose on the Mars base (about 0.67 mSv per sol).',
    access: 'Built-in reference values',
    endpoints: [],
    link: 'https://science.nasa.gov/mission/msl-curiosity/',
    files: ['src/sol/config.ts'],
  },
  {
    id: 'nasa-std-3001',
    name: 'NASA-STD-3001, Space Flight Human-System Standard',
    provider: 'NASA',
    what: 'NASA’s health standards for astronauts, including the career radiation limit.',
    usedFor: 'The 600 mSv career radiation limit in the sol engine.',
    access: 'Built-in reference values',
    endpoints: [],
    link: 'https://ntrs.nasa.gov/search?q=%22NASA-STD-3001%22',
    files: ['src/sol/config.ts'],
  },
  {
    id: 'artemis-milky-way',
    name: 'Background photo: "Starstruck", the Milky Way photographed by the Artemis II crew',
    provider: 'NASA Image and Video Library (photo art002e012588, April 7, 2026, credit: NASA)',
    what: 'A real photograph of our galaxy taken by the Artemis II astronauts. It is decoration, not data.',
    usedFor: 'The slowly drifting space background behind the app’s pages. It is cropped to a widescreen shape and darkened so text stays readable.',
    access: 'Built-in reference values',
    endpoints: [],
    link: 'https://images.nasa.gov/details/art002e012588',
    files: ['public/media/space-bg-4k.webp', 'public/media/space-bg-1080.webp', 'src/index.css'],
  },
];

// ---------------------------------------------------------------- real versus simplified numbers

export interface NumberRow {
  /** Where it lives in the config, for example "crew.oxygenPerPersonPerSol". */
  path: string;
  /** Top-level group, for example "crew". */
  group: string;
  value: number;
  unit: string;
  real: boolean;
  note: string;
}

function collect(node: unknown, path: string, rows: NumberRow[]): void {
  if (node && typeof node === 'object' && 'basis' in node && 'value' in node) {
    const param = node as Param;
    rows.push({ path, group: path.split('.')[0]!, value: param.value, unit: param.unit, real: param.basis === 'NASA_BASED', note: param.note });
    return;
  }
  if (node && typeof node === 'object') for (const [key, child] of Object.entries(node)) collect(child, path ? `${path}.${key}` : key, rows);
}

/** Every number in the sol engine, labelled real or simplified, real ones first. */
export function numberRows(): NumberRow[] {
  const rows: NumberRow[] = [];
  collect(SOL_CONFIG, '', rows);
  collect(DECISION_AMOUNTS, 'decisions', rows);
  return rows.sort((a, b) => Number(b.real) - Number(a.real));
}

/** "crew.oxygenPerPersonPerSol" → "Crew: oxygen per person per sol". */
export function readableName(path: string): string {
  const words = (text: string) => text.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  const [group, ...rest] = path.split('.');
  const head = words(group ?? '');
  return `${head.charAt(0).toUpperCase()}${head.slice(1)}: ${rest.map(words).join(', ')}`;
}

/** Real values used outside the sol engine config. */
export const OTHER_REAL_VALUES: { name: string; value: string; source: string }[] = [
  { name: 'Speed of light (radio signals)', value: '299,792.458 km/s', source: 'Exact, by definition (SI)' },
  { name: 'Average Earth–Moon distance', value: '384,400 km', source: 'NASA Moon Fact Sheet' },
  { name: 'Earth–Mars distance today', value: 'Calculated for today’s date', source: 'JPL approximate planet positions' },
  { name: 'Solar flare classes (A, B, C, M, X) and the NOAA R and G scales', value: 'Official thresholds', source: 'NOAA Space Weather Prediction Center' },
  { name: 'Water the space station recycles', value: 'About 98%', source: 'NASA (shown as a fact; the game recycler uses its own value)' },
];

/** Things that are game rules, so they are never presented as measurements. */
export const ALWAYS_SIMPLIFIED = [
  'The station game (oxygen, water, food and energy as 0–100% tanks, its storms, faults and timings). All of its numbers are game values, listed in src/simulation/config.ts.',
  'Radiation Storm severity, costs and harm. The solar event is real; what it does in the game is a game mechanic, not a radiation forecast.',
  'Muscles & bones and rest rates, and how much a workout or rest day restores. The effects are real (see the OSDR studies); the rates are game values.',
  'Scores, ranks and badges.',
  'Time: a sol passes in a few minutes, and waits for Mission Control are sped up. The radio delays shown are always the real ones.',
];
