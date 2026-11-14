import { RESOURCES, SOL_CONFIG as C, type Param, type Resource } from './config';
import { DECISIONS, findDecision, validateDecision } from './decisions';
import type { ActionReport, Amounts, Decision, LedgerEntry, NightConditions, Phase, Result, SolState } from './types';

/**
 * The sol engine: the rules of a sol-based survival mission, with no screen code.
 *
 * Each sol runs in three phases:
 *   1. decision  the crew chooses up to N decisions (each one a trade-off)
 *   2. action    the 3D game plays out the tasks those decisions created and reports back
 *   3. night     automatic upkeep: power, life support, food, radiation, crew health
 * Then the next sol begins.
 *
 * Every function returns a new state and never changes the one it is given,
 * and the same inputs always give the same result. Every change to a resource
 * is written to the ledger, so the ledger always adds up to the current totals.
 */

export const CLEAR_NIGHT: NightConditions = { sunlight: 1, radiation: 1 };

// ---------------------------------------------------------------- helpers

const amountsOf = (params: Partial<Record<Resource, Param>> | undefined): Amounts =>
  Object.fromEntries(Object.entries(params ?? {}).map(([resource, param]) => [resource, param!.value])) as Amounts;

const capacity = (resource: Resource) => C.capacity[resource].value;
const isEmpty = (amounts: Amounts) => Object.values(amounts).every((value) => !value);

function copy(state: SolState): SolState {
  return {
    ...state,
    resources: { ...state.resources },
    decisionsThisSol: [...state.decisionsThisSol],
    plannedTasks: [...state.plannedTasks],
    tonight: { ...state.tonight, deferred: [...state.tonight.deferred] },
    ledger: [...state.ledger],
  };
}

/**
 * Applies costs, then gains, keeping every resource between 0 and its
 * capacity. Returns the amounts that were really applied, so the ledger
 * records the truth even when a store is full or empty.
 */
function transact(state: SolState, gains: Amounts, costs: Amounts): { gave: Amounts; cost: Amounts } {
  const gave: Amounts = {};
  const cost: Amounts = {};
  for (const resource of RESOURCES) {
    const want = costs[resource] ?? 0;
    if (want <= 0) continue;
    const taken = Math.min(want, state.resources[resource]);
    state.resources[resource] = round(state.resources[resource] - taken);
    if (taken > 0) cost[resource] = round(taken);
  }
  for (const resource of RESOURCES) {
    const want = gains[resource] ?? 0;
    if (want <= 0) continue;
    const added = Math.min(want, capacity(resource) - state.resources[resource]);
    state.resources[resource] = round(state.resources[resource] + added);
    if (added > 0) gave[resource] = round(added);
  }
  return { gave, cost };
}

/** Rounds away floating-point dust so totals reconcile exactly. */
const round = (value: number) => Math.round(value * 1e6) / 1e6;

function record(state: SolState, phase: Phase, source: string, label: string, gains: Amounts, costs: Amounts, note?: string): { gave: Amounts; cost: Amounts } {
  const applied = transact(state, gains, costs);
  if (!isEmpty(applied.gave) || !isEmpty(applied.cost) || note) {
    state.ledger.push({ sol: state.sol, phase, source, label, gave: applied.gave, cost: applied.cost, ...(note ? { note } : {}) });
  }
  return applied;
}

// ---------------------------------------------------------------- starting and choosing

export function createSolState(): SolState {
  // Refuse to start with any decision that breaks the trade-off rule.
  for (const decision of DECISIONS) {
    const problems = validateDecision(decision);
    if (problems.length > 0) throw new Error(`Decision "${decision.id}" is invalid: ${problems.join('; ')}`);
  }
  return {
    sol: 1,
    phase: 'decision',
    status: 'active',
    resources: Object.fromEntries(RESOURCES.map((resource) => [resource, C.start[resource].value])) as Record<Resource, number>,
    radiationDose: 0,
    decisionsThisSol: [],
    plannedTasks: [],
    tonight: { heatingLow: false, greenhouseOff: false, deferred: [] },
    ledger: [],
  };
}

/** Why a decision cannot be taken right now, or null if it can. */
export function whyNot(state: SolState, decisionId: string): string | null {
  const decision = findDecision(decisionId);
  if (!decision) return `There is no decision called "${decisionId}".`;
  if (state.status !== 'active') return 'The mission is over.';
  if (state.phase !== 'decision') return 'Decisions can only be made in the decision phase.';
  if (state.decisionsThisSol.includes(decisionId)) return 'That decision has already been made this sol.';
  if (state.decisionsThisSol.length >= C.time.decisionsPerSol.value) return `Only ${C.time.decisionsPerSol.value} decisions can be made each sol.`;
  if (decision.nightEffect === 'heatingLow' && state.tonight.heatingLow) return "Tonight's heating is already turned down.";
  if (decision.nightEffect === 'greenhouseOff' && state.tonight.greenhouseOff) return "Tonight's greenhouse is already switched off.";
  for (const [resource, param] of Object.entries(decision.costs) as [Resource, Param][]) {
    if (state.resources[resource] < param.value) return `Not enough ${resource}: it needs ${param.value} ${param.unit} and there is ${state.resources[resource]}.`;
  }
  return null;
}

/** The decisions that can be taken now, each with its reason if not. */
export function decisionOptions(state: SolState): { decision: Decision; available: boolean; reason: string | null }[] {
  return DECISIONS.map((decision) => {
    const reason = whyNot(state, decision.id);
    return { decision, available: reason === null, reason };
  });
}

/**
 * Takes one decision. All-or-nothing: if any cost cannot be paid, nothing
 * changes and no ledger entry is written.
 */
export function choose(state: SolState, decisionId: string): Result<SolState> {
  const reason = whyNot(state, decisionId);
  if (reason) return { ok: false, reason };
  const decision = findDecision(decisionId)!;
  const next = copy(state);
  next.decisionsThisSol.push(decision.id);

  const immediateGains = decision.gainsAfterAction ? {} : amountsOf(decision.gains);
  const note = decision.gainsAfterAction ? `Reward depends on the action phase: ${decision.gainsAfterAction.taskLabel}.` : undefined;
  record(next, 'decision', decision.id, decision.title, immediateGains, amountsOf(decision.costs), note);

  if (decision.gainsAfterAction) next.plannedTasks.push({ taskId: decision.gainsAfterAction.taskId, label: decision.gainsAfterAction.taskLabel, decisionId: decision.id });
  if (decision.nightEffect === 'heatingLow') next.tonight.heatingLow = true;
  if (decision.nightEffect === 'greenhouseOff') next.tonight.greenhouseOff = true;
  if (decision.deferredCosts) next.tonight.deferred.push({ decisionId: decision.id, label: decision.title, costs: amountsOf(decision.deferredCosts) });
  return { ok: true, state: next };
}

/** Ends the decision phase. The tasks planned so far go to the action phase. */
export function endDecisionPhase(state: SolState): Result<SolState> {
  if (state.status !== 'active') return { ok: false, reason: 'The mission is over.' };
  if (state.phase !== 'decision') return { ok: false, reason: 'The decision phase has already ended.' };
  const next = copy(state);
  next.phase = 'action';
  return { ok: true, state: next };
}

// ---------------------------------------------------------------- action phase

/**
 * Takes the result of the 3D action phase. Every planned task must be
 * reported exactly once, as completed or failed. Completed tasks pay their
 * decision's reward; failed tasks pay only `failedTaskGainShare` of it (the
 * costs were already paid when the decision was made).
 */
export function resolveActionPhase(state: SolState, report: ActionReport): Result<SolState> {
  if (state.status !== 'active') return { ok: false, reason: 'The mission is over.' };
  if (state.phase !== 'action') return { ok: false, reason: 'It is not the action phase.' };

  const planned = new Set(state.plannedTasks.map((task) => task.taskId));
  const reported = [...report.completed, ...report.failed];
  const unknown = reported.filter((taskId) => !planned.has(taskId));
  if (unknown.length > 0) return { ok: false, reason: `These tasks were not planned this sol: ${unknown.join(', ')}.` };
  if (new Set(reported).size !== reported.length) return { ok: false, reason: 'A task was reported more than once.' };
  const missing = [...planned].filter((taskId) => !reported.includes(taskId));
  if (missing.length > 0) return { ok: false, reason: `These planned tasks were not reported: ${missing.join(', ')}.` };
  const lost = report.crewHealthLost ?? 0;
  if (!Number.isFinite(lost) || lost < 0) return { ok: false, reason: 'Crew health lost must be zero or more.' };

  const next = copy(state);
  for (const task of state.plannedTasks) {
    const decision = findDecision(task.decisionId)!;
    const gains = amountsOf(decision.gains);
    if (report.completed.includes(task.taskId)) {
      record(next, 'action', decision.id, `${task.label}: completed`, gains, {});
    } else {
      const share = C.action.failedTaskGainShare.value;
      const partial = Object.fromEntries(Object.entries(gains).map(([resource, value]) => [resource, value! * share])) as Amounts;
      record(next, 'action', decision.id, `${task.label}: failed`, partial, {}, 'The task failed, so the reward was lost. The costs were paid when the decision was made.');
    }
  }
  const clampedLoss = Math.min(lost, C.action.maxCrewHealthLoss.value);
  if (clampedLoss > 0) {
    record(next, 'action', 'system:action-injuries', 'Injuries and strain in the action phase', {}, { crewHealth: clampedLoss }, clampedLoss < lost ? `Reported ${lost}, limited to ${clampedLoss}.` : undefined);
  }
  next.plannedTasks = [];
  next.phase = 'night';
  if (next.resources.crewHealth <= 0) next.status = 'failed';
  return { ok: true, state: next };
}

// ---------------------------------------------------------------- night phase

/**
 * Runs the night: power, life support, food, radiation and crew health,
 * then starts the next sol. `conditions` brings in things outside the
 * crew's control, such as a dust storm or a solar particle event.
 */
export function endSol(state: SolState, conditions: NightConditions = CLEAR_NIGHT): Result<SolState> {
  if (state.status !== 'active') return { ok: false, reason: 'The mission is over.' };
  if (state.phase !== 'night') return { ok: false, reason: 'The night can only start after the action phase.' };
  if (!(conditions.sunlight >= 0 && conditions.sunlight <= 1)) return { ok: false, reason: 'Sunlight must be between 0 and 1.' };
  if (!(conditions.radiation >= 0) || !Number.isFinite(conditions.radiation)) return { ok: false, reason: 'Radiation must be zero or more.' };

  const next = copy(state);
  const P = C.power;
  const crew = C.crew.size.value;
  let penalised = false;

  // 1. Power: collect sunlight into the batteries (anything beyond their capacity
  //    is lost), then run tonight's systems. If there is not enough,
  //    switch things off in this order: greenhouse, full heating, oxygen generator.
  record(next, 'night', 'system:solar', 'Solar panels charge the batteries', { power: P.solarPerSol.value * conditions.sunlight }, {}, conditions.sunlight < 1 ? `Sunlight at ${Math.round(conditions.sunlight * 100)}% of normal.` : undefined);

  let greenhouseOn = !next.tonight.greenhouseOff;
  let heatingLow = next.tonight.heatingLow;
  let oxygenGeneratorOn = true;
  const demand = () => P.lifeSupportLoad.value + (oxygenGeneratorOn ? P.oxygenGeneratorLoad.value : 0) + (heatingLow ? P.heatingLowLoad.value : P.heatingNormalLoad.value) + (greenhouseOn ? P.greenhouseLoad.value : 0);
  const shed: string[] = [];
  if (demand() > next.resources.power && greenhouseOn) {
    greenhouseOn = false;
    shed.push('greenhouse');
  }
  if (demand() > next.resources.power && !heatingLow) {
    heatingLow = true;
    shed.push('heating');
  }
  if (demand() > next.resources.power) {
    oxygenGeneratorOn = false;
    shed.push('oxygen generator');
  }
  const brownout = demand() > next.resources.power;
  record(next, 'night', 'system:power', 'Night power for habitat systems', {}, { power: demand() }, shed.length > 0 ? `Not enough power: switched off or turned down the ${shed.join(', then the ')}.` : undefined);

  // 2. Costs that today's decisions moved to tonight.
  for (const item of next.tonight.deferred) {
    // A cold night costs crew health; a dark greenhouse costs the crop it would have grown.
    record(next, 'night', item.decisionId, `${item.label}: tonight's cost`, {}, item.costs, 'Deferred cost of a decision made today.');
    if (item.costs.crewHealth) penalised = true;
  }

  // 3. Automatic shortfalls that no decision caused.
  if (shed.includes('greenhouse')) {
    record(next, 'night', 'system:power-shortage', 'Greenhouse switched off for lack of power', {}, {}, `Tonight's crop (${C.greenhouse.yieldPerSol.value} kg) did not grow.`);
  }
  if (shed.includes('heating')) {
    record(next, 'night', 'system:power-shortage', 'Heating turned down for lack of power', {}, { crewHealth: C.health.coldNightLoss.value });
    penalised = true;
  }
  if (brownout) {
    record(next, 'night', 'system:brownout', 'Life support ran short of power', {}, { crewHealth: C.health.brownoutLoss.value });
    penalised = true;
  }

  // 4. Life support: breathing, drinking, eating, growing.
  const oxygenNeed = crew * C.crew.oxygenPerPersonPerSol.value;
  const waterNeed = crew * C.crew.waterPerPersonPerSol.value * (1 - C.lifeSupport.waterRecoveryShare.value) + (oxygenGeneratorOn ? C.lifeSupport.oxygenGeneratorWaterLoss.value : 0);
  const foodNeed = crew * C.crew.foodPerPersonPerSol.value;
  // Production comes first, so tonight's oxygen and crop can be used tonight.
  record(next, 'night', 'system:production', 'Systems make oxygen and grow food', { oxygen: oxygenGeneratorOn ? oxygenNeed : 0, food: greenhouseOn ? C.greenhouse.yieldPerSol.value : 0 }, {});
  const before = { ...next.resources };
  record(next, 'night', 'system:life-support', 'Crew breathes, drinks and eats', {}, { oxygen: oxygenNeed, water: waterNeed, food: foodNeed }, oxygenGeneratorOn ? undefined : 'The oxygen generator was off, so the crew breathed from the reserve.');
  // A store that could not cover the night's need means a shortage.
  const shortages: [Resource, number, string][] = [];
  if (before.oxygen < oxygenNeed) shortages.push(['oxygen', C.health.oxygenShortLoss.value, 'Oxygen ran out']);
  if (before.water < waterNeed) shortages.push(['water', C.health.waterShortLoss.value, 'Water ran out']);
  if (before.food < foodNeed) shortages.push(['food', C.health.foodShortLoss.value, 'Food ran out']);
  for (const [, loss, label] of shortages) {
    record(next, 'night', 'system:shortage', label, {}, { crewHealth: loss });
    penalised = true;
  }

  // 5. Shielding wears, and the crew receives the night's radiation.
  record(next, 'night', 'system:wear', 'Shielding wears down', {}, { shielding: C.shielding.wearPerSol.value });
  const blocked = (next.resources.shielding / 100) * C.shielding.maxDoseReduction.value;
  const dose = round(C.radiation.surfaceDosePerSol.value * conditions.radiation * (1 - blocked));
  next.radiationDose = round(next.radiationDose + dose);
  const radiationLoss = Math.max(0, dose - C.radiation.safeDosePerSol.value) * C.radiation.healthLossPerMsvOverSafe.value;
  if (radiationLoss > 0) {
    record(next, 'night', 'system:radiation', 'Radiation harms the crew', {}, { crewHealth: radiationLoss }, `Dose tonight: ${dose} mSv.`);
    penalised = true;
  }

  // 6. Recovery after a good night: warm, no shortages, nothing running low.
  const nothingLow = (['oxygen', 'water', 'food', 'power'] as const).every((resource) => next.resources[resource] >= C.warningShare.value * capacity(resource));
  if (!penalised && nothingLow) record(next, 'night', 'system:recovery', 'The crew recovers after a good night', { crewHealth: C.health.recoveryPerSol.value }, {});

  // 7. Next sol, or the end of the mission.
  next.decisionsThisSol = [];
  next.tonight = { heatingLow: false, greenhouseOff: false, deferred: [] };
  if (next.resources.crewHealth <= 0) {
    next.status = 'failed';
  } else if (next.sol >= C.time.missionLengthSols.value) {
    next.status = 'complete';
  } else {
    next.sol += 1;
    next.phase = 'decision';
  }
  return { ok: true, state: next };
}

// ---------------------------------------------------------------- ledger helpers

/** Net change per resource across ledger entries (gave minus cost). */
export function ledgerTotals(entries: readonly LedgerEntry[]): Record<Resource, number> {
  const totals = Object.fromEntries(RESOURCES.map((resource) => [resource, 0])) as Record<Resource, number>;
  for (const entry of entries) {
    for (const resource of RESOURCES) totals[resource] = round(totals[resource] + (entry.gave[resource] ?? 0) - (entry.cost[resource] ?? 0));
  }
  return totals;
}

/** What one decision gave and cost in total, across its decision, action and night entries. */
export function decisionReport(state: SolState, decisionId: string, sol = state.sol): { gave: Amounts; cost: Amounts } {
  const gave: Amounts = {};
  const cost: Amounts = {};
  for (const entry of state.ledger) {
    if (entry.source !== decisionId || entry.sol !== sol) continue;
    for (const resource of RESOURCES) {
      if (entry.gave[resource]) gave[resource] = round((gave[resource] ?? 0) + entry.gave[resource]!);
      if (entry.cost[resource]) cost[resource] = round((cost[resource] ?? 0) + entry.cost[resource]!);
    }
  }
  return { gave, cost };
}

/** Is the mission a scientific success? */
export const researchGoalMet = (state: SolState) => state.resources.research >= C.goal.researchTarget.value;
