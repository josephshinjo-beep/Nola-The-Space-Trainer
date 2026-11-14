import { describe, expect, it } from 'vitest';
import { DECISION_AMOUNTS, RESOURCES, SOL_CONFIG as C, type Param } from './config';
import { DECISIONS, validateDecision } from './decisions';
import { choose, createSolState, decisionOptions, decisionReport, endDecisionPhase, endSol, ledgerTotals, researchGoalMet, resolveActionPhase, whyNot } from './engine';
import type { ActionReport, Decision, NightConditions, Result, SolState } from './types';

/** Unwraps a result, failing the test with the engine's reason if it was refused. */
function ok<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`Refused: ${result.reason}`);
  return result.state;
}

/** Plays one whole sol: decisions, the action phase, then the night. */
function playSol(state: SolState, decisions: string[] = [], report?: ActionReport, night?: NightConditions): SolState {
  let s = state;
  for (const id of decisions) s = ok(choose(s, id));
  s = ok(endDecisionPhase(s));
  s = ok(resolveActionPhase(s, report ?? { completed: s.plannedTasks.map((task) => task.taskId), failed: [] }));
  return ok(endSol(s, night));
}

const start = () => createSolState();
const initial = () => Object.fromEntries(RESOURCES.map((r) => [r, C.start[r].value])) as Record<(typeof RESOURCES)[number], number>;

/** Every value in the config tree, with its path. */
function allParams(node: unknown, path = ''): [string, Param][] {
  if (node && typeof node === 'object' && 'basis' in node && 'value' in node) return [[path, node as Param]];
  if (node && typeof node === 'object') return Object.entries(node).flatMap(([key, child]) => allParams(child, path ? `${path}.${key}` : key));
  return [];
}

describe('config', () => {
  it('labels every number as NASA-based or simplified, with a note', () => {
    const params = [...allParams(C), ...allParams(DECISION_AMOUNTS)];
    expect(params.length).toBeGreaterThan(60);
    for (const [path, param] of params) {
      expect(['NASA_BASED', 'SIMPLIFIED'], path).toContain(param.basis);
      expect(param.note.length, path).toBeGreaterThan(10);
      expect(Number.isFinite(param.value), path).toBe(true);
      expect(param.unit.length, path).toBeGreaterThan(0);
    }
  });

  it('names a source for every NASA-based number', () => {
    for (const [path, param] of [...allParams(C), ...allParams(DECISION_AMOUNTS)].filter(([, p]) => p.basis === 'NASA_BASED')) {
      expect(param.note, path).toMatch(/Source|NASA|Science|mol/);
    }
  });

  it('uses the real figures where it says it does', () => {
    expect(C.crew.oxygenPerPersonPerSol.value).toBe(0.84);
    expect(C.time.solLengthSeconds.value).toBe(24 * 3600 + 39 * 60 + 35);
    expect(C.radiation.surfaceDosePerSol.value).toBeCloseTo(0.67);
    // Electrolysis: 18 g of water gives 16 g of oxygen.
    expect(DECISION_AMOUNTS.boostOxygenGenerator.waterCost.value).toBeCloseTo((DECISION_AMOUNTS.boostOxygenGenerator.oxygenGain.value * 18) / 16);
  });

  it('keeps diverted power equal to what tonight\'s system goes without', () => {
    expect(DECISION_AMOUNTS.divertPowerToShielding.powerFromHeating.value).toBe(C.power.heatingNormalLoad.value - C.power.heatingLowLoad.value);
    expect(DECISION_AMOUNTS.divertPowerToShielding.powerFromGreenhouse.value).toBe(C.power.greenhouseLoad.value);
  });
});

describe('the trade-off rule: no decision is free', () => {
  it('holds for every decision in the catalogue', () => {
    expect(DECISIONS.length).toBeGreaterThanOrEqual(10);
    for (const decision of DECISIONS) expect(validateDecision(decision), decision.id).toEqual([]);
  });

  it('every decision costs at least one resource it does not give', () => {
    for (const decision of DECISIONS) {
      const gains = new Set(Object.keys(decision.gains));
      const costs = [...Object.keys(decision.costs), ...Object.keys(decision.deferredCosts ?? {})];
      expect(costs.some((resource) => !gains.has(resource)), decision.id).toBe(true);
    }
  });

  it('rejects free decisions and fake costs', () => {
    const p = (value: number): Param => ({ value, unit: 'x', basis: 'SIMPLIFIED', note: 'test value only' });
    const base: Decision = { id: 't', title: 't', summary: 't', gains: { research: p(3) }, costs: { power: p(2) } };
    expect(validateDecision(base)).toEqual([]);
    expect(validateDecision({ ...base, costs: {} })).toContainEqual(expect.stringMatching(/free/));
    expect(validateDecision({ ...base, costs: { research: p(1) } })).toContainEqual(expect.stringMatching(/another resource/));
    expect(validateDecision({ ...base, costs: { power: p(0) } })).toContainEqual(expect.stringMatching(/more than zero/));
    expect(validateDecision({ ...base, gains: {} })).toContainEqual(expect.stringMatching(/gives nothing/));
    expect(validateDecision({ ...base, nightEffect: 'heatingLow' })).toContainEqual(expect.stringMatching(/deferred cost/));
    // A cost that only lands tonight still counts.
    expect(validateDecision({ ...base, costs: {}, deferredCosts: { food: p(2) } })).toEqual([]);
  });
});

describe('making decisions', () => {
  it('applies exactly the declared gains and costs, and records them in the ledger', () => {
    const s = ok(choose(start(), 'boost-oxygen-generator'));
    const A = DECISION_AMOUNTS.boostOxygenGenerator;
    expect(s.resources.oxygen).toBe(C.start.oxygen.value + A.oxygenGain.value);
    expect(s.resources.water).toBe(C.start.water.value - A.waterCost.value);
    expect(s.resources.power).toBe(C.start.power.value - A.powerCost.value);
    expect(s.ledger.at(-1)).toMatchObject({ sol: 1, phase: 'decision', source: 'boost-oxygen-generator', gave: { oxygen: 2 }, cost: { water: 2.25, power: 10 } });
  });

  it('spends oxygen for an extra research task, paying out only when the task succeeds', () => {
    let s = ok(choose(start(), 'extra-research-task'));
    expect(s.resources.oxygen).toBe(C.start.oxygen.value - 2);
    expect(s.resources.research).toBe(0);
    expect(s.plannedTasks).toEqual([{ taskId: 'extra-research', label: expect.any(String), decisionId: 'extra-research-task' }]);
    s = ok(endDecisionPhase(s));
    const won = ok(resolveActionPhase(s, { completed: ['extra-research'], failed: [] }));
    expect(won.resources.research).toBe(4);
    const lost = ok(resolveActionPhase(s, { completed: [], failed: ['extra-research'] }));
    expect(lost.resources.research).toBe(0);
    expect(lost.resources.oxygen).toBe(C.start.oxygen.value - 2);
    expect(lost.ledger.at(-1)).toMatchObject({ phase: 'action', label: expect.stringMatching(/failed/), note: expect.stringMatching(/reward was lost/) });
  });

  it('diverting power to shielding makes tonight cold, and the cost is recorded against that decision', () => {
    let s = ok(choose(start(), 'divert-power-heating'));
    expect(s.resources.shielding).toBe(C.start.shielding.value + 12);
    expect(s.resources.power).toBe(C.start.power.value - 12);
    expect(s.tonight.heatingLow).toBe(true);
    s = ok(resolveActionPhase(ok(endDecisionPhase(s)), { completed: [], failed: [] }));
    const night = ok(endSol(s));
    const report = decisionReport(night, 'divert-power-heating', 1);
    expect(report).toEqual({ gave: { shielding: 12 }, cost: { power: 12, crewHealth: C.health.coldNightLoss.value } });
    // A cold night means no recovery.
    expect(night.ledger.some((e) => e.source === 'system:recovery')).toBe(false);
    // The heating really ran low: the night drew the low heating load.
    const power = night.ledger.find((e) => e.source === 'system:power')!;
    expect(power.cost.power).toBe(C.power.lifeSupportLoad.value + C.power.oxygenGeneratorLoad.value + C.power.heatingLowLoad.value + C.power.greenhouseLoad.value);
  });

  it('diverting greenhouse power to shielding loses tonight\'s crop', () => {
    const s = playSol(start(), ['divert-power-greenhouse']);
    expect(decisionReport(s, 'divert-power-greenhouse', 1)).toEqual({ gave: { shielding: 12 }, cost: { power: 12, food: C.greenhouse.yieldPerSol.value } });
    const production = s.ledger.find((e) => e.source === 'system:production')!;
    expect(production.gave.food).toBeUndefined();
  });

  it('skipping maintenance rests the crew but wears the shield', () => {
    const s = ok(choose(start(), 'skip-maintenance'));
    expect(s.resources.crewHealth).toBe(C.start.crewHealth.value + 4);
    expect(s.resources.shielding).toBe(C.start.shielding.value - 6);
  });

  it('is all-or-nothing: an unaffordable decision changes nothing and writes no ledger entry', () => {
    const poor: SolState = { ...start(), resources: { ...start().resources, oxygen: 1.5 } };
    const result = choose(poor, 'extra-research-task');
    expect(result).toEqual({ ok: false, reason: expect.stringMatching(/Not enough oxygen/) });
    expect(poor.ledger).toEqual([]);
    expect(poor.resources.oxygen).toBe(1.5);
  });

  it('allows each decision once per sol, and only a fixed number per sol', () => {
    let s = ok(choose(start(), 'report-to-earth'));
    expect(choose(s, 'report-to-earth')).toMatchObject({ ok: false, reason: expect.stringMatching(/already been made/) });
    s = ok(choose(s, 'rest-day'));
    expect(choose(s, 'push-water-recycler')).toMatchObject({ ok: false, reason: expect.stringMatching(/Only 2 decisions/) });
    expect(decisionOptions(s).filter((o) => o.available)).toEqual([]);
  });

  it('cannot turn tonight\'s heating down twice', () => {
    expect(whyNot(start(), 'divert-power-heating')).toBeNull();
    const s = ok(choose(start(), 'divert-power-heating'));
    expect(whyNot(s, 'divert-power-greenhouse')).toBeNull();
  });

  it('does not change the state it is given', () => {
    const s = start();
    const snapshot = JSON.stringify(s);
    choose(s, 'boost-oxygen-generator');
    playSol(s, ['rest-day', 'report-to-earth']);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});

describe('phases', () => {
  it('runs decision, then action, then night, in that order only', () => {
    let s = start();
    expect(resolveActionPhase(s, { completed: [], failed: [] })).toMatchObject({ ok: false });
    expect(endSol(s)).toMatchObject({ ok: false });
    s = ok(endDecisionPhase(s));
    expect(s.phase).toBe('action');
    expect(choose(s, 'rest-day')).toMatchObject({ ok: false, reason: expect.stringMatching(/decision phase/) });
    s = ok(resolveActionPhase(s, { completed: [], failed: [] }));
    expect(s.phase).toBe('night');
    s = ok(endSol(s));
    expect(s).toMatchObject({ sol: 2, phase: 'decision', decisionsThisSol: [] });
  });

  it('checks the action report: every planned task once, nothing extra, bounded injuries', () => {
    const s = ok(endDecisionPhase(ok(choose(start(), 'maintenance-eva'))));
    expect(resolveActionPhase(s, { completed: [], failed: [] })).toMatchObject({ ok: false, reason: expect.stringMatching(/not reported/) });
    expect(resolveActionPhase(s, { completed: ['shield-repair', 'moon-landing'], failed: [] })).toMatchObject({ ok: false, reason: expect.stringMatching(/not planned/) });
    expect(resolveActionPhase(s, { completed: ['shield-repair'], failed: ['shield-repair'] })).toMatchObject({ ok: false, reason: expect.stringMatching(/more than once/) });
    expect(resolveActionPhase(s, { completed: ['shield-repair'], failed: [], crewHealthLost: -5 })).toMatchObject({ ok: false });
    const hurt = ok(resolveActionPhase(s, { completed: ['shield-repair'], failed: [], crewHealthLost: 50 }));
    expect(hurt.resources.crewHealth).toBe(C.start.crewHealth.value - 3 - C.action.maxCrewHealthLoss.value);
    expect(hurt.ledger.at(-1)).toMatchObject({ source: 'system:action-injuries', cost: { crewHealth: 10 }, note: expect.stringMatching(/limited/) });
  });

  it('spending more power on decisions than the solar surplus drains the batteries', () => {
    let s = start();
    let refused = 0;
    for (let sol = 0; sol < 15; sol++) {
      let t = s;
      for (const id of ['report-to-earth', 'boost-oxygen-generator']) {
        if (whyNot(t, id) === null) t = ok(choose(t, id));
        else if (/Not enough power/.test(whyNot(t, id)!)) refused += 1;
      }
      s = ok(endSol(ok(resolveActionPhase(ok(endDecisionPhase(t)), { completed: [], failed: [] }))));
    }
    // A clear night with no spending leaves the batteries at capacity minus the night load.
    const restingLevel = C.capacity.power.value - (C.power.lifeSupportLoad.value + C.power.oxygenGeneratorLoad.value + C.power.heatingNormalLoad.value + C.power.greenhouseLoad.value);
    expect(s.resources.power).toBeLessThan(restingLevel);
    expect(refused).toBeGreaterThan(0);
  });

  it('ends the mission after the last sol, and reports the research goal', () => {
    let s = start();
    let sols = 0;
    while (s.status === 'active') {
      // 3 kWh a sol fits inside the solar surplus; skipping maintenance costs shielding, not power.
      s = playSol(s, ['report-to-earth', 'skip-maintenance'].filter((id) => whyNot(s, id) === null));
      sols += 1;
    }
    expect(sols).toBe(C.time.missionLengthSols.value);
    expect(s.status).toBe('complete');
    expect(s.resources.research).toBe(C.time.missionLengthSols.value * 2);
    expect(researchGoalMet(s)).toBe(true);
  });
});

describe('the night', () => {
  it('a quiet night with no decisions follows the life-support numbers', () => {
    const s = playSol(start());
    const crew = C.crew.size.value;
    expect(s.resources.food).toBeCloseTo(C.start.food.value - crew * C.crew.foodPerPersonPerSol.value + C.greenhouse.yieldPerSol.value);
    expect(s.resources.water).toBeCloseTo(C.start.water.value - crew * C.crew.waterPerPersonPerSol.value * (1 - C.lifeSupport.waterRecoveryShare.value) - C.lifeSupport.oxygenGeneratorWaterLoss.value);
    expect(s.resources.oxygen).toBe(C.start.oxygen.value);
    expect(s.resources.shielding).toBe(C.start.shielding.value - C.shielding.wearPerSol.value);
    expect(s.resources.crewHealth).toBe(C.start.crewHealth.value + C.health.recoveryPerSol.value);
    expect(s.radiationDose).toBeGreaterThan(0);
    expect(s.radiationDose).toBeLessThan(C.radiation.surfaceDosePerSol.value);
  });

  it('a dust storm switches systems off in order: greenhouse, heating, then the oxygen generator', () => {
    const poor: SolState = { ...start(), resources: { ...start().resources, power: 0 } };
    const at = (sunlight: number) => {
      const s = playSol(poor, [], undefined, { sunlight, radiation: 1 });
      return s.ledger.find((e) => e.source === 'system:power')?.note ?? '';
    };
    expect(at(1)).toBe('');
    expect(at(0.85)).toMatch(/greenhouse\.$/);
    expect(at(0.6)).toMatch(/greenhouse, then the heating\.$/);
    expect(at(0.4)).toMatch(/greenhouse, then the heating, then the oxygen generator/);
    const dark = playSol(poor, [], undefined, { sunlight: 0, radiation: 1 });
    expect(dark.ledger.some((e) => e.source === 'system:brownout')).toBe(true);
    expect(dark.resources.oxygen).toBeCloseTo(C.start.oxygen.value - C.crew.size.value * C.crew.oxygenPerPersonPerSol.value);
  });

  it('shielding cuts the radiation dose, and a solar storm hurts an unshielded crew', () => {
    const storm = { sunlight: 1, radiation: 30 };
    const shielded = playSol({ ...start(), resources: { ...start().resources, shielding: 100 } }, [], undefined, storm);
    const bare = playSol({ ...start(), resources: { ...start().resources, shielding: 0 } }, [], undefined, storm);
    expect(bare.radiationDose).toBeGreaterThan(shielded.radiationDose * 2);
    expect(bare.resources.crewHealth).toBeLessThan(shielded.resources.crewHealth);
    expect(bare.ledger.some((e) => e.source === 'system:radiation')).toBe(true);
  });

  it('running out hurts the crew gradually instead of killing at once', () => {
    const empty: SolState = { ...start(), resources: { ...start().resources, food: 0, water: 0 } };
    const s = playSol(empty);
    expect(s.status).toBe('active');
    expect(s.resources.crewHealth).toBe(C.start.crewHealth.value - C.health.waterShortLoss.value - C.health.foodShortLoss.value);
  });

  it('a mission fails when crew health reaches zero', () => {
    const weak: SolState = { ...start(), resources: { ...start().resources, crewHealth: 4, food: 0 } };
    expect(playSol(weak).status).toBe('failed');
  });

  it('rejects impossible night conditions', () => {
    const s = ok(resolveActionPhase(ok(endDecisionPhase(start())), { completed: [], failed: [] }));
    expect(endSol(s, { sunlight: 2, radiation: 1 })).toMatchObject({ ok: false });
    expect(endSol(s, { sunlight: 1, radiation: -1 })).toMatchObject({ ok: false });
  });
});

describe('the ledger', () => {
  it('always adds up to the change in every resource, over a long mixed mission', () => {
    const plan = [
      ['extra-research-task', 'divert-power-heating'],
      ['boost-oxygen-generator', 'ration-meals'],
      ['maintenance-eva', 'report-to-earth'],
      ['divert-power-greenhouse', 'skip-maintenance'],
      ['clean-solar-panels', 'rest-day'],
      ['boost-greenhouse-lights', 'push-water-recycler'],
    ];
    const nights: NightConditions[] = [{ sunlight: 1, radiation: 1 }, { sunlight: 0.3, radiation: 1 }, { sunlight: 1, radiation: 25 }];
    let s = start();
    for (let sol = 0; sol < 24 && s.status === 'active'; sol++) {
      let t = s;
      // Take each planned decision only if it is affordable at that moment.
      for (const id of plan[sol % plan.length]!) if (whyNot(t, id) === null) t = ok(choose(t, id));
      t = ok(endDecisionPhase(t));
      const tasks = t.plannedTasks.map((task) => task.taskId);
      // Fail every other task, and report some injuries now and then.
      t = ok(resolveActionPhase(t, { completed: tasks.filter((_, i) => (sol + i) % 2 === 0), failed: tasks.filter((_, i) => (sol + i) % 2 === 1), crewHealthLost: sol % 5 === 0 ? 2 : 0 }));
      s = ok(endSol(t, nights[sol % nights.length]));

      const totals = ledgerTotals(s.ledger);
      for (const resource of RESOURCES) {
        expect(initial()[resource] + totals[resource], `${resource} after sol ${s.sol}`).toBeCloseTo(s.resources[resource], 6);
        expect(s.resources[resource], resource).toBeGreaterThanOrEqual(0);
        expect(s.resources[resource], resource).toBeLessThanOrEqual(C.capacity[resource].value);
      }
    }
    expect(s.ledger.length).toBeGreaterThan(100);
  });

  it('records only what was really applied when a store is full', () => {
    const full: SolState = { ...start(), resources: { ...start().resources, crewHealth: 98 } };
    const s = ok(choose(full, 'rest-day'));
    expect(s.resources.crewHealth).toBe(100);
    expect(s.ledger.at(-1)).toMatchObject({ gave: { crewHealth: 2 }, cost: { food: 1.5 } });
  });

  it('every ledger entry for a decision shows something it cost', () => {
    const s = playSol(playSol(start(), ['extra-research-task', 'divert-power-greenhouse']), ['maintenance-eva', 'boost-oxygen-generator']);
    for (const id of ['extra-research-task', 'divert-power-greenhouse']) expect(Object.keys(decisionReport(s, id, 1).cost).length, id).toBeGreaterThan(0);
    for (const id of ['maintenance-eva', 'boost-oxygen-generator']) expect(Object.keys(decisionReport(s, id, 2).cost).length, id).toBeGreaterThan(0);
  });
});

describe('pacing (from the survival-crafting checklist)', () => {
  it('shows how long each store lasts with no decisions at all', () => {
    let s = start();
    const firstLow: Record<string, number | null> = { oxygen: null, water: null, food: null, power: null };
    while (s.status === 'active') {
      s = playSol(s);
      for (const resource of Object.keys(firstLow) as (keyof typeof firstLow)[]) {
        if (firstLow[resource] === null && s.resources[resource as 'food'] < C.warningShare.value * C.capacity[resource as 'food'].value) firstLow[resource] = s.sol;
      }
    }
    console.info(`[pacing] Doing nothing for ${C.time.missionLengthSols.value} sols, first sol each store fell below the warning line:`, firstLow, `| research: ${s.resources.research}`);
    // Doing nothing is survivable but fails the science goal: decisions are needed to succeed.
    expect(s.status).toBe('complete');
    expect(researchGoalMet(s)).toBe(false);
    // Food is the slow pressure: it runs low before the mission ends without help.
    expect(firstLow.food).not.toBeNull();
    expect(firstLow.food!).toBeGreaterThan(10);
  });
});
