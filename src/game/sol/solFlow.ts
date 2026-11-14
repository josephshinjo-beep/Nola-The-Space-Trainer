import { RESOURCES, type Resource } from '../../sol/config';
import { choose, CLEAR_NIGHT, createSolState, decisionReport, endDecisionPhase, endSol, resolveActionPhase } from '../../sol/engine';
import type { Amounts, NightConditions, Result, SolState } from '../../sol/types';
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
}

export function newSolSave(): SolSave {
  return { version: 1, state: createSolState(), doneTasks: [] };
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

/** What a sol did, in a form the summary screen can word for children. */
export interface SolSummary {
  sol: number;
  card: KidCard | null;
  jobDone: boolean;
  /** Net change over the whole sol, including the night. */
  change: Amounts;
  /** What the chosen card gave and cost, including its night cost. */
  cardGave: Amounts;
  cardCost: Amounts;
  events: string[];
  missionOver: 'complete' | 'failed' | null;
}

const KID_EVENTS: Record<string, string> = {
  'system:power-shortage': 'There was not enough power, so some machines were turned down.',
  'system:brownout': 'The power ran very low, and the crew had a hard night.',
  'system:shortage': 'Something ran out tonight, and the crew suffered.',
  'system:radiation': 'Space radiation hurt the crew tonight.',
  'system:recovery': 'The crew had a good night and feels better.',
  'system:action-injuries': 'Someone got hurt during the day.',
};

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
  const events = [...new Set(solEntries.map((entry) => KID_EVENTS[entry.source]).filter((text): text is string => Boolean(text)))];
  const summary: SolSummary = {
    sol: before.sol,
    card: job?.card ?? null,
    jobDone: job?.done ?? false,
    change,
    cardGave: report.gave,
    cardCost: report.cost,
    events,
    missionOver: after.status === 'active' ? null : after.status,
  };
  return { ok: true, state: { ...save, state: after, doneTasks: [] }, summary };
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
    state: { ...(state as SolState), tonight: { ...state.tonight, deferred: state.tonight.deferred ?? [] } },
  };
}
