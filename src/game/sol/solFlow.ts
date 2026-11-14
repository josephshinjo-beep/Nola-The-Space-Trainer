import { RESOURCES, type Resource } from '../../sol/config';
import { choose, CLEAR_NIGHT, createSolState, decisionReport, endDecisionPhase, endSol, resolveActionPhase, respondToStorm, startRadiationStorm, stormArrives, type StormStart } from '../../sol/engine';
import type { Amounts, BodyPart, LedgerEntry, NightConditions, RadiationStorm, Result, SolState, StormChoice } from '../../sol/types';
import type { ScienceTopic } from '../../data/astronautScience';
import { findDecision } from '../../sol/decisions';
import { findCard, type KidCard } from './cards';

/**
 * The sol flow as the station game uses it:
 *   morning  plan the sol at the Command Console by choosing one card
 *   day      do the card's urgent job at its machine
 *   evening  end the sol at the Command Console, and see what happened
 *
 * Plain functions with no screen code, so they are easy to test. The
 * saved game is a SolSave: the engine state plus the urgent jobs done today.
 */

export interface SolSave {
  version: 1;
  state: SolState;
  /** Task ids of urgent jobs finished in the current sol. */
  doneTasks: string[];
  /** Identifies this mission, so a finished mission is counted in the record only once. */
  missionId: string;
  /** True once the tutorial sol has been finished or skipped. */
  tutorialDone: boolean;
}

const newMissionId = () => `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function newSolSave(): SolSave {
  return { version: 1, state: createSolState(), doneTasks: [], missionId: newMissionId(), tutorialDone: false };
}

/** Morning: choose one card. The engine takes its costs and plans its urgent job. */
export function planSol(save: SolSave, decisionId: string): Result<SolSave> {
  const chosen = choose(save.state, decisionId);
  if (!chosen.ok) return chosen;
  const ended = endDecisionPhase(chosen.state);
  if (!ended.ok) return ended;
  return { ok: true, state: { ...save, state: ended.state, doneTasks: [] } };
}

/** Morning, when no card can be chosen (nothing affordable): go straight to the day. */
export function skipPlanning(save: SolSave): Result<SolSave> {
  const ended = endDecisionPhase(save.state);
  return ended.ok ? { ok: true, state: { ...save, state: ended.state } } : ended;
}

export interface UrgentJob {
  card: KidCard;
  taskId: string;
  done: boolean;
}

/** Today's urgent job, if one has been planned. */
export function urgentJob(save: SolSave): UrgentJob | null {
  const task = save.state.plannedTasks[0];
  if (!task) return null;
  const card = findCard(task.decisionId);
  return card ? { card, taskId: task.taskId, done: save.doneTasks.includes(task.taskId) } : null;
}

/** Day: mark the urgent job as done (from the machine's panel). */
export function completeJob(save: SolSave, taskId: string): SolSave {
  if (!save.state.plannedTasks.some((task) => task.taskId === taskId) || save.doneTasks.includes(taskId)) return save;
  return { ...save, doneTasks: [...save.doneTasks, taskId] };
}

// ---------------------------------------------------------------- radiation storms

/** A storm warning, from a real solar event. */
export function announceStorm(save: SolSave, start: StormStart): Result<SolSave> {
  const next = startRadiationStorm(save.state, start);
  return next.ok ? { ok: true, state: { ...save, state: next.state } } : next;
}

/** The crew's answer to the storm warning. */
export function answerStorm(save: SolSave, choice: StormChoice): Result<SolSave> {
  const next = respondToStorm(save.state, choice);
  return next.ok ? { ok: true, state: { ...save, state: next.state } } : next;
}

/** The countdown ended: the storm arrives. Returns the storm that hit, for the message. */
export function stormHits(save: SolSave): Result<SolSave> & { storm?: RadiationStorm } {
  const storm = save.state.storm;
  const next = stormArrives(save.state);
  if (!next.ok) return next;
  return { ok: true, state: { ...save, state: next.state }, ...(storm ? { storm } : {}) };
}

/** Should a new storm warning start now? Every few sols, during the day, once per sol. */
export function stormIsDue(save: SolSave, everySols: number): boolean {
  const s = save.state;
  if (s.status !== 'active' || s.phase !== 'action' || s.storm || s.sol % everySols !== 0) return false;
  return !s.ledger.some((entry) => entry.sol === s.sol && entry.source.startsWith('storm:') && entry.label === 'Radiation storm warning');
}

/** The player skipped the tutorial. */
export const skipTutorial = (save: SolSave): SolSave => ({ ...save, tutorialDone: true });

/** What a sol did, in a form the summary screen can word for children. */
export interface SolSummary {
  sol: number;
  card: KidCard | null;
  jobDone: boolean;
  /** Net change over the whole sol, including the night. */
  change: Amounts;
  /** What the chosen card gave and cost, including its night cost. */
  cardGave: Amounts;
  /** What the card did for the crew's body (only when its job was done). */
  bodyGave: Partial<Record<BodyPart, number>>;
  cardCost: Amounts;
  events: string[];
  /** The Astronaut Science topic that explains today's change in crew health, if it changed. */
  science: ScienceTopic | null;
  missionOver: 'complete' | 'failed' | null;
}

const KID_EVENTS: Record<string, string> = {
  'system:power-shortage': 'There was not enough power, so some machines were turned down.',
  'system:brownout': 'The power ran very low, and the crew had a hard night.',
  'system:shortage': 'Something ran out tonight, and the crew suffered.',
  'system:radiation': 'Space radiation hurt the crew tonight.',
  'system:recovery': 'The crew had a good night and feels better.',
  'system:action-injuries': 'Someone got hurt during the day.',
  'system:deconditioning': 'Weak muscles and bones made the crew feel worse. A workout helps!',
  'system:fatigue': 'The crew was too tired and felt worse. A rest day helps!',
};

const KID_STORM_EVENTS: Record<string, string> = {
  'Storm hits the reinforced shield': 'A radiation storm hit, but the stronger shield protected the crew.',
  'Storm passes while the crew shelters': 'A radiation storm passed while the crew stayed safe in the shelter.',
  'Storm hits an unprotected crew': 'A radiation storm hit and the crew was not protected.',
};

/**
 * Which real research explains what happened to the crew's health today.
 * Harm comes first (radiation, weak muscles, tiredness), then help
 * (a finished workout or rest). Null if nothing about health happened.
 */
export function scienceTopicFor(entries: readonly LedgerEntry[]): ScienceTopic | null {
  const has = (test: (entry: LedgerEntry) => boolean) => entries.some(test);
  const completed = (id: string) => has((entry) => entry.source === id && entry.phase === 'action' && entry.label.endsWith(': completed'));
  if (has((entry) => entry.source === 'system:radiation' || (entry.source.startsWith('storm:') && (entry.cost.crewHealth ?? 0) > 0))) return 'radiation';
  if (has((entry) => entry.source === 'system:deconditioning')) return 'muscle-bone';
  if (has((entry) => entry.source === 'system:fatigue')) return 'sleep';
  if (completed('exercise')) return 'exercise';
  if (completed('rest-day') || completed('skip-maintenance')) return 'sleep';
  return null;
}

/** Evening: end the sol. The urgent job counts as failed if it was not done. */
export function finishSol(save: SolSave, conditions: NightConditions = CLEAR_NIGHT): Result<SolSave> & { summary?: SolSummary } {
  const before = save.state;
  const planned = before.plannedTasks.map((task) => task.taskId);
  const job = urgentJob(save);
  const acted = resolveActionPhase(before, { completed: planned.filter((id) => save.doneTasks.includes(id)), failed: planned.filter((id) => !save.doneTasks.includes(id)) });
  if (!acted.ok) return acted;
  const night = acted.state.status === 'active' ? endSol(acted.state, conditions) : acted;
  if (!night.ok) return night;

  const after = night.state;
  const solEntries = after.ledger.filter((entry) => entry.sol === before.sol);
  const change: Amounts = {};
  for (const resource of RESOURCES) {
    const delta = Math.round((after.resources[resource] - before.resources[resource]) * 100) / 100;
    if (delta !== 0) change[resource as Resource] = delta;
  }
  const report = job ? decisionReport(after, job.card.decisionId, before.sol) : { gave: {}, cost: {} };
  const events = [...new Set(solEntries.map((entry) => (entry.source.startsWith('storm:') ? KID_STORM_EVENTS[entry.label] : KID_EVENTS[entry.source])).filter((text): text is string => Boolean(text)))];
  const summary: SolSummary = {
    sol: before.sol,
    card: job?.card ?? null,
    jobDone: job?.done ?? false,
    change,
    cardGave: report.gave,
    bodyGave: job?.done ? Object.fromEntries(Object.entries(findDecision(job.card.decisionId)?.bodyEffect ?? {}).map(([part, param]) => [part, param!.value])) : {},
    cardCost: report.cost,
    events,
    science: change.crewHealth !== undefined || scienceTopicFor(solEntries) ? scienceTopicFor(solEntries) : null,
    missionOver: after.status === 'active' ? null : after.status,
  };
  // Finishing the first sol finishes the tutorial.
  return { ok: true, state: { ...save, state: after, doneTasks: [], tutorialDone: save.tutorialDone || before.sol === 1 }, summary };
}

/** Checks a save loaded from the database before trusting it. */
export function reviveSolSave(raw: unknown): SolSave | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const save = raw as Partial<SolSave>;
  const state = save.state as Partial<SolState> | undefined;
  if (save.version !== 1 || !state || typeof state.sol !== 'number' || !Array.isArray(save.doneTasks)) return null;
  if (!['decision', 'action', 'night'].includes(state.phase as string) || !['active', 'complete', 'failed'].includes(state.status as string)) return null;
  if (!state.resources || !RESOURCES.every((resource) => typeof state.resources?.[resource] === 'number' && Number.isFinite(state.resources[resource]))) return null;
  if (!Array.isArray(state.ledger) || !Array.isArray(state.plannedTasks) || !Array.isArray(state.decisionsThisSol) || !state.tonight) return null;
  return {
    version: 1,
    doneTasks: save.doneTasks.filter((id): id is string => typeof id === 'string'),
    // Saves from before these fields existed: a fixed id, and no tutorial once past sol 1.
    missionId: typeof save.missionId === 'string' && save.missionId ? save.missionId : 'mission-before-records',
    tutorialDone: typeof save.tutorialDone === 'boolean' ? save.tutorialDone : state.sol > 1,
    state: {
      ...(state as SolState),
      tonight: { ...state.tonight, deferred: state.tonight.deferred ?? [] },
      // Saves from before the crew's body was tracked start fully fit.
      body: isBody(state.body) ? state.body : { muscleBone: 100, rest: 100 },
      // Saves from before radiation storms existed have neither field.
      storm: isStorm(state.storm) ? state.storm : null,
      stormEventsUsed: Array.isArray(state.stormEventsUsed) ? state.stormEventsUsed.filter((id): id is string => typeof id === 'string') : [],
    },
  };
}

function isStorm(value: unknown): value is RadiationStorm {
  if (typeof value !== 'object' || value === null) return false;
  const storm = value as Partial<RadiationStorm>;
  return (
    typeof storm.event?.id === 'string' &&
    typeof storm.event.time === 'string' &&
    ['FLR', 'CME', 'SEP'].includes(storm.event.type as string) &&
    [1, 2, 3].includes(storm.severity as number) &&
    typeof storm.arrivesAtStationMinute === 'number' &&
    (storm.choice === null || storm.choice === 'reinforce' || storm.choice === 'shelter')
  );
}

function isBody(value: unknown): value is SolState['body'] {
  const body = value as Partial<SolState['body']> | null;
  return typeof body?.muscleBone === 'number' && Number.isFinite(body.muscleBone) && typeof body.rest === 'number' && Number.isFinite(body.rest);
}
