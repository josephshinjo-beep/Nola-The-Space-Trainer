import type { StationStats } from '../../features/academy/achievements';
import { RESOURCES, SOL_CONFIG as C, type Resource } from '../../sol/config';
import { findDecision } from '../../sol/decisions';
import type { Amounts, LedgerEntry, SolState } from '../../sol/types';
import { LINE_LABELS } from '../sol/cards';

/**
 * The mission record: everything the debrief, badges and ranks need, worked
 * out from the saved sol mission (its ledger) and station stats. Nothing is
 * guessed: each number comes from something the player actually did.
 */

const MISSION_SOLS = C.time.missionLengthSols.value;
/** How much a resource is "worth" when comparing trade-offs: its capacity, or the science goal for research. */
const scale = (resource: Resource) => (resource === 'research' ? C.goal.researchTarget.value : C.capacity[resource].value);
const CONSUMABLES = ['oxygen', 'water', 'food', 'power', 'shielding', 'crewHealth'] as const;

/** Resources just before a ledger entry: today's totals with every later change undone. */
function resourcesBefore(state: SolState, index: number): Record<Resource, number> {
  const totals = { ...state.resources };
  for (const entry of state.ledger.slice(index)) {
    for (const resource of RESOURCES) totals[resource] -= (entry.gave[resource] ?? 0) - (entry.cost[resource] ?? 0);
  }
  return totals;
}

const solsWith = (ledger: readonly LedgerEntry[], test: (entry: LedgerEntry) => boolean) => new Set(ledger.filter(test).map((entry) => entry.sol));
const isDecision = (entry: LedgerEntry) => entry.phase === 'decision' && Boolean(findDecision(entry.source));
const isStormChoice = (entry: LedgerEntry) => entry.source.startsWith('storm:') && (entry.label.startsWith('Reinforce') || entry.label.startsWith('Shelter'));
const STORM_ARRIVALS = ['Storm hits the reinforced shield', 'Storm passes while the crew shelters', 'Storm hits an unprotected crew'];
const EMERGENCIES = new Set(['system:shortage', 'system:brownout', 'system:power-shortage']);

/** Sols the crew got through: all of them if the mission is complete. */
export const solsSurvived = (state: SolState) => (state.status === 'complete' ? MISSION_SOLS : Math.max(0, state.sol - 1));

// ---------------------------------------------------------------- score

export interface ScorePart {
  id: 'smart-choices' | 'storm-ready' | 'crew-care' | 'follow-through' | 'no-emergencies';
  title: string;
  /** What it measures, in kid words. */
  explain: string;
  /** Share of chances taken well (0-1), or null if there was no chance to show it. */
  share: number | null;
  /** "6 of 8 choices". */
  detail: string;
}

export interface MissionScore {
  /** 0-100. */
  total: number;
  survival: { points: number; max: number; sols: number };
  reasoning: { points: number; max: number; parts: ScorePart[] };
  rating: 'Outstanding' | 'Strong' | 'Good start' | 'Keep training';
}

export const SURVIVAL_MAX = 40;
export const REASONING_MAX = 60;

function part(id: ScorePart['id'], title: string, explain: string, good: number, chances: number, noun: string): ScorePart {
  return { id, title, explain, share: chances > 0 ? good / chances : null, detail: chances > 0 ? `${good} of ${chances} ${chances === 1 ? noun.replace(/s$/, '') : noun}` : `No ${noun} this mission` };
}

/**
 * A choice is smart if it tops up the store that was lowest at the time,
 * or if it only spends from stores that were above the warning line.
 */
export function isSmartChoice(state: SolState, index: number): boolean {
  const entry = state.ledger[index]!;
  const decision = findDecision(entry.source);
  if (!decision) return false;
  const before = resourcesBefore(state, index);
  const share = (resource: Resource) => before[resource] / scale(resource);
  const lowest = [...CONSUMABLES].sort((a, b) => share(a) - share(b))[0]!;
  if (lowest in decision.gains) return true;
  return (Object.keys(decision.costs) as Resource[]).every((resource) => resource === 'research' || share(resource) >= C.warningShare.value);
}

export function scoreMission(state: SolState): MissionScore {
  const { ledger } = state;
  const sols = solsSurvived(state);
  const played = Math.max(1, state.status === 'active' ? state.sol - 1 : state.sol);

  const decisionIndexes = ledger.map((entry, index) => (isDecision(entry) ? index : -1)).filter((index) => index >= 0);
  const smart = decisionIndexes.filter((index) => isSmartChoice(state, index)).length;
  const arrivals = ledger.filter((entry) => entry.source.startsWith('storm:') && STORM_ARRIVALS.includes(entry.label));
  const protectedStorms = arrivals.filter((entry) => entry.label !== 'Storm hits an unprotected crew').length;
  const bodyTrouble = solsWith(ledger, (entry) => entry.source === 'system:fatigue' || entry.source === 'system:deconditioning').size;
  const tasks = ledger.filter((entry) => entry.phase === 'action' && (entry.label.endsWith(': completed') || entry.label.endsWith(': failed')));
  const done = tasks.filter((entry) => entry.label.endsWith(': completed')).length;
  const emergencies = solsWith(ledger, (entry) => EMERGENCIES.has(entry.source)).size;

  const parts: ScorePart[] = [
    part('smart-choices', 'Smart choices', 'Spending from what you had plenty of, or topping up what was lowest.', smart, decisionIndexes.length, 'choices'),
    part('storm-ready', 'Ready for storms', 'Protecting the crew before a radiation storm arrived.', protectedStorms, arrivals.length, 'storms'),
    part('crew-care', 'Crew care', 'Nights the crew was rested and strong enough.', played - bodyTrouble, played, 'nights'),
    part('follow-through', 'Follow-through', 'Finishing the urgent job you planned.', done, tasks.length, 'urgent jobs'),
    part('no-emergencies', 'Planning ahead', 'Nights with no shortage of air, water, food or power.', played - emergencies, played, 'nights'),
  ];
  const counted = parts.filter((p) => p.share !== null);
  const reasoningShare = counted.length > 0 ? counted.reduce((sum, p) => sum + p.share!, 0) / counted.length : 0;
  const reasoning = Math.round(REASONING_MAX * reasoningShare);
  const survival = Math.round((SURVIVAL_MAX * sols) / MISSION_SOLS);
  const total = survival + reasoning;
  const rating = total >= 85 ? 'Outstanding' : total >= 70 ? 'Strong' : total >= 50 ? 'Good start' : 'Keep training';
  return { total, survival: { points: survival, max: SURVIVAL_MAX, sols }, reasoning: { points: reasoning, max: REASONING_MAX, parts }, rating };
}

// ---------------------------------------------------------------- biggest trade-off

/** "12 kWh of power", "8% crew health", "2 science points": words that read aloud well. */
export function amountWords(resource: Resource, amount: number): string {
  const value = Math.round(amount * 10) / 10;
  const name = LINE_LABELS[resource].name.toLowerCase();
  if (resource === 'research') return `${value} science point${value === 1 ? '' : 's'}`;
  const unit = C.capacity[resource].unit;
  return unit === '%' ? `${value}% ${name}` : `${value} ${unit} of ${name}`;
}

const list = (items: string[]) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);
const weight = (cost: Amounts) => (Object.entries(cost) as [Resource, number][]).reduce((sum, [resource, amount]) => sum + amount / scale(resource), 0);

export interface TradeOff {
  sol: number;
  /** One or two sentences that read aloud well. */
  text: string;
}

/** The choice that cost the most, compared by share of each store, with what it was for. */
export function biggestTradeOff(state: SolState): TradeOff | null {
  const candidates = state.ledger.filter((entry) => isDecision(entry) || isStormChoice(entry));
  if (candidates.length === 0) return null;
  const top = candidates.reduce((best, entry) => (weight(entry.cost) > weight(best.cost) ? entry : best));
  const gave = list((Object.entries(top.cost) as [Resource, number][]).map(([resource, amount]) => amountWords(resource, amount)));
  if (isStormChoice(top)) {
    const how = top.label.startsWith('Reinforce') ? 'to reinforce the shield' : 'to keep the crew in the shelter';
    return { sol: top.sol, text: `On sol ${top.sol}, a radiation storm was coming. You gave up ${gave} ${how}, so the storm could not hurt the crew as much.` };
  }
  const decision = findDecision(top.source)!;
  const gets = [...Object.keys(decision.gains), ...Object.keys(decision.bodyEffect ?? {})].map((key) => LINE_LABELS[key as Resource].name.toLowerCase());
  const finished = state.ledger.some((entry) => entry.sol === top.sol && entry.source === top.source && entry.label.endsWith(': completed'));
  return {
    sol: top.sol,
    text: `On sol ${top.sol}, you chose "${decision.title}". You gave up ${gave} to get more ${list(gets)}.${finished ? '' : ' The urgent job was not finished, so the reward was lost.'}`,
  };
}

// ---------------------------------------------------------------- what real planners do

export interface PlannerLesson {
  id: string;
  text: string;
}

const LESSONS: Record<string, string> = {
  reserves: 'Mission planners keep spare air, water and food on board, so one bad day does not become an emergency.',
  power: 'Engineers write a power budget: they add up what every machine needs before switching it on, and keep some in the batteries for the night.',
  storms: 'NASA has a team that watches space radiation around the clock and tells astronauts when to move to the best-shielded part of the station.',
  body: 'Astronauts on the space station exercise about two hours every day, and their work and sleep are planned carefully.',
  'follow-through': 'Mission control plans each day minute by minute, and crews report back when every job is done.',
  comms: 'For Mars, planners expect radio delays of up to about 22 minutes each way, so crews train to solve problems on their own.',
  tradeoffs: 'Every choice uses something up. Real planners compare the options and write down why they chose, just like you did.',
};

/** Three real practices, chosen to match what happened in this mission. */
export function plannerLessons(state: SolState, score: MissionScore): PlannerLesson[] {
  const weakest = score.reasoning.parts.filter((p) => p.share !== null).sort((a, b) => a.share! - b.share!)[0];
  const fromWeakest: Record<ScorePart['id'], string> = { 'smart-choices': 'reserves', 'storm-ready': 'storms', 'crew-care': 'body', 'follow-through': 'follow-through', 'no-emergencies': 'reserves' };
  const ids = new Set<string>();
  if (weakest) ids.add(fromWeakest[weakest.id]);
  const spentPower = state.ledger.some((entry) => isDecision(entry) && (entry.cost.power ?? 0) > 0);
  const hadStorm = state.ledger.some((entry) => entry.source.startsWith('storm:'));
  for (const id of [spentPower ? 'power' : null, hadStorm ? 'storms' : null, 'body', 'comms']) if (id && ids.size < 2) ids.add(id);
  ids.add('tradeoffs');
  return [...ids].slice(0, 3).map((id) => ({ id, text: LESSONS[id]! }));
}

// ---------------------------------------------------------------- badges

export interface ConceptBadge {
  id: 'shielding' | 'power-budget' | 'comms-delay' | 'storm-smart' | 'body-care' | 'life-support';
  title: string;
  concept: string;
  /** The Academy module that teaches it, if there is one. */
  moduleId: string | null;
  /** How to show it in the game. */
  useIt: string;
}

export const CONCEPT_BADGES: ConceptBadge[] = [
  { id: 'shielding', title: 'Shield Keeper', concept: 'Radiation shielding', moduleId: 'radiation-protection', useIt: 'Finish a plan that strengthens the radiation shield.' },
  { id: 'power-budget', title: 'Power Budgeter', concept: 'Power budgeting', moduleId: 'energy-and-electricity', useIt: 'Spend power on two plans and get through 5 sols with no power shortage.' },
  { id: 'comms-delay', title: 'Signal Delay Expert', concept: 'Communication delay', moduleId: 'communication-and-emergencies', useIt: 'Fix a station problem, either by asking Mission Control or on your own training.' },
  { id: 'storm-smart', title: 'Storm Smart', concept: 'Solar storms', moduleId: 'radiation-protection', useIt: 'Protect the crew before a radiation storm arrives.' },
  { id: 'body-care', title: 'Fit for Space', concept: 'Exercise and rest', moduleId: null, useIt: 'Finish a workout and a rest day.' },
  { id: 'life-support', title: 'Life Support Pro', concept: 'Life support', moduleId: 'oxygen-and-breathing', useIt: 'Get through 10 sols with no shortage of air, water or food.' },
];

/** Which concept badges the game part has been shown for (the Academy part is checked separately). */
export function badgesUsed(sol: SolState | null, station: StationStats | null): Set<ConceptBadge['id']> {
  const used = new Set<ConceptBadge['id']>();
  if ((station?.askedEarthFixes ?? 0) + (station?.trainingFixes ?? 0) >= 1) used.add('comms-delay');
  if (!sol) return used;
  const { ledger } = sol;
  const completed = (test: (decisionId: string) => boolean) => ledger.some((entry) => entry.label.endsWith(': completed') && test(entry.source));
  if (completed((id) => Boolean(findDecision(id)?.gains.shielding))) used.add('shielding');
  const powerPlans = ledger.filter((entry) => isDecision(entry) && (entry.cost.power ?? 0) > 0).length;
  const played = sol.status === 'active' ? sol.sol - 1 : sol.sol;
  const powerTrouble = solsWith(ledger, (entry) => entry.source === 'system:brownout' || entry.source === 'system:power-shortage').size;
  if (powerPlans >= 2 && played - powerTrouble >= 5) used.add('power-budget');
  if (ledger.some((entry) => entry.source.startsWith('storm:') && STORM_ARRIVALS.slice(0, 2).includes(entry.label))) used.add('storm-smart');
  if (completed((id) => id === 'exercise') && completed((id) => id === 'rest-day')) used.add('body-care');
  const shortages = solsWith(ledger, (entry) => entry.source === 'system:shortage').size;
  if (played - shortages >= 10) used.add('life-support');
  return used;
}

export interface BadgeStatus extends ConceptBadge {
  learned: boolean;
  used: boolean;
  earned: boolean;
}

/** A badge needs both halves: the concept learned in the Academy and used in the game. Badges saved earlier stay earned. */
export function badgeStatus(completedModules: readonly string[], used: Set<ConceptBadge['id']>, savedEarned: readonly string[] = []): BadgeStatus[] {
  return CONCEPT_BADGES.map((badge) => {
    const learned = badge.moduleId === null || completedModules.includes(badge.moduleId);
    const isUsed = used.has(badge.id);
    return { ...badge, learned, used: isUsed, earned: savedEarned.includes(badge.id) || (learned && isUsed) };
  });
}

// ---------------------------------------------------------------- ranks

export interface Rank {
  title: 'Cadet' | 'Crew Member' | 'Flight Engineer' | 'Mission Specialist' | 'Commander';
  points: number;
  next: { title: Rank['title']; pointsNeeded: number; extra?: string } | null;
}

export const RANKS: { title: Rank['title']; points: number }[] = [
  { title: 'Cadet', points: 0 },
  { title: 'Crew Member', points: 3 },
  { title: 'Flight Engineer', points: 8 },
  { title: 'Mission Specialist', points: 13 },
  { title: 'Commander', points: 18 },
];

/** How rank points are earned. */
export const RANK_POINTS = { perModule: 1, perBadge: 2, missionComplete: 5 };
export const COMMANDER_MIN_SCORE = 60;

/**
 * Rank from Academy modules passed, concept badges earned and completed
 * missions. Commander also needs a completed mission with a good score,
 * so it takes good reasoning, not just time spent.
 */
export function rankFor(modulesCompleted: number, badgesEarned: number, missionsCompleted: number, bestScore: number): Rank {
  const points = modulesCompleted * RANK_POINTS.perModule + badgesEarned * RANK_POINTS.perBadge + Math.min(missionsCompleted, 1) * RANK_POINTS.missionComplete;
  const commanderReady = missionsCompleted > 0 && bestScore >= COMMANDER_MIN_SCORE;
  const reached = RANKS.filter((rank) => points >= rank.points && (rank.title !== 'Commander' || commanderReady));
  const current = reached.at(-1)!;
  const nextRank = RANKS[RANKS.indexOf(RANKS.find((rank) => rank.title === current.title)!) + 1];
  return {
    title: current.title,
    points,
    next: nextRank
      ? {
          title: nextRank.title,
          pointsNeeded: Math.max(0, nextRank.points - points),
          ...(nextRank.title === 'Commander' && !commanderReady ? { extra: `Also complete a mission with a score of at least ${COMMANDER_MIN_SCORE}.` } : {}),
        }
      : null,
  };
}

// ---------------------------------------------------------------- the saved record

/** Kept across station restarts at users/{uid}/simulation/record, so badges and ranks are not lost. */
export interface SavedRecord {
  badges: string[];
  bestScore: number;
  missionsCompleted: number;
  /** Ids of finished missions already counted (the sol save's first ledger time is not stored, so we use a started-at stamp). */
  countedMissions: string[];
}

export const EMPTY_RECORD: SavedRecord = { badges: [], bestScore: 0, missionsCompleted: 0, countedMissions: [] };

export function reviveRecord(raw: unknown): SavedRecord {
  const data = (raw ?? {}) as Partial<SavedRecord>;
  const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
  const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);
  return { badges: strings(data.badges), bestScore: Math.min(100, count(data.bestScore)), missionsCompleted: count(data.missionsCompleted), countedMissions: strings(data.countedMissions) };
}

/**
 * Adds what is new: badges just earned, and a finished mission (counted
 * once, by its id). Returns null when nothing changed, so nothing is saved.
 */
export function mergeRecord(record: SavedRecord, earnedBadges: readonly string[], finished: { missionId: string; score: number; complete: boolean } | null): SavedRecord | null {
  const badges = [...new Set([...record.badges, ...earnedBadges])];
  let { bestScore, missionsCompleted, countedMissions } = record;
  if (finished && !countedMissions.includes(finished.missionId)) {
    countedMissions = [...countedMissions, finished.missionId];
    bestScore = Math.max(bestScore, finished.score);
    if (finished.complete) missionsCompleted += 1;
  }
  const changed = badges.length !== record.badges.length || countedMissions !== record.countedMissions;
  return changed ? { badges, bestScore, missionsCompleted, countedMissions } : null;
}
