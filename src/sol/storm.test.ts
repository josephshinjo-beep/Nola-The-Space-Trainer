import { describe, expect, it } from 'vitest';
import { SOL_CONFIG as C } from './config';
import { createSolState, endDecisionPhase, endSol, ledgerTotals, resolveActionPhase, respondToStorm, startRadiationStorm, stormArrives, stormChoiceCost, stormHarm, whyNotStormChoice, type StormStart } from './engine';
import type { Result, SolState } from './types';
import { announceStorm, finishSol, newSolSave, planSol, reviveSolSave, stormIsDue, type SolSave } from '../game/sol/solFlow';

function ok<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`Refused: ${result.reason}`);
  return result.state;
}

const S = C.storm;
const flare = (severity: 1 | 2 | 3 = 2, id = '2017-09-06T11:53:00-FLR-001'): StormStart => ({
  event: { id, type: 'FLR', time: '2017-09-06T11:53:00.000Z', detail: 'class X9.3', link: null },
  severity,
  live: false,
  arrivesAtStationMinute: 600,
});
const inAction = () => ok(endDecisionPhase(createSolState()));
const reconciles = (s: SolState) => {
  const totals = ledgerTotals(s.ledger);
  for (const [resource, value] of Object.entries(s.resources)) expect(value, resource).toBeCloseTo(C.start[resource as keyof typeof C.start].value + totals[resource as keyof typeof totals]);
};

describe('radiation storms', () => {
  it('labels every storm number as simplified, with a note', () => {
    for (const param of Object.values(S)) {
      expect(param.basis).toBe('SIMPLIFIED');
      expect(param.note.length).toBeGreaterThan(10);
    }
  });

  it('announces one storm at a time, and uses each real event only once', () => {
    const s = ok(startRadiationStorm(inAction(), flare()));
    expect(s.storm).toMatchObject({ severity: 2, choice: null, announcedSol: 1, arrivesAtStationMinute: 600 });
    expect(s.stormEventsUsed).toEqual([flare().event.id]);
    expect(startRadiationStorm(s, flare(1, 'other')).ok).toBe(false);
    const after = ok(stormArrives(s));
    expect(startRadiationStorm(after, flare()).ok).toBe(false);
    expect(startRadiationStorm(after, flare(1, 'other')).ok).toBe(true);
  });

  it('reinforcing costs power and water; sheltering costs research time', () => {
    const s = ok(startRadiationStorm(inAction(), flare(2)));
    const reinforced = ok(respondToStorm(s, 'reinforce'));
    expect(s.resources.power - reinforced.resources.power).toBe(S.reinforcePowerPerSeverity.value * 2);
    expect(s.resources.water - reinforced.resources.water).toBe(S.reinforceWaterPerSeverity.value * 2);
    expect(reinforced.resources.research).toBe(s.resources.research);
    const sheltered = ok(respondToStorm(s, 'shelter'));
    expect(s.resources.research - sheltered.resources.research).toBe(S.shelterResearchPerSeverity.value * 2);
    expect(sheltered.resources.power).toBe(s.resources.power);
    expect(respondToStorm(sheltered, 'reinforce').ok).toBe(false);
  });

  it('refuses a choice the station cannot afford, changing nothing', () => {
    const s = ok(startRadiationStorm(inAction(), flare(3)));
    const poor: SolState = { ...s, resources: { ...s.resources, research: 1 } };
    expect(whyNotStormChoice(poor, 'shelter')).toMatch(/Not enough research/);
    expect(respondToStorm(poor, 'shelter').ok).toBe(false);
    expect(whyNotStormChoice(createSolState(), 'shelter')).toMatch(/no radiation storm/);
  });

  it('harms the crew least in the shelter and most when unprotected', () => {
    const s = ok(startRadiationStorm(inAction(), flare(2)));
    const health = s.resources.crewHealth;
    const hit = (state: SolState) => health - ok(stormArrives(state)).resources.crewHealth;
    expect(hit(s)).toBe(S.harmUnprotectedPerSeverity.value * 2);
    expect(hit(ok(respondToStorm(s, 'reinforce')))).toBe(S.harmReinforcedPerSeverity.value * 2);
    expect(hit(ok(respondToStorm(s, 'shelter')))).toBe(0);
    expect(stormHarm('shelter', 3)).toBeLessThan(stormHarm('reinforce', 3));
    expect(stormHarm('reinforce', 3)).toBeLessThan(stormHarm(null, 3));
    expect(ok(stormArrives(s)).storm).toBeNull();
  });

  it('a storm still pending at night arrives with the night, and the ledger still adds up', () => {
    let s = ok(startRadiationStorm(inAction(), flare(1)));
    s = ok(respondToStorm(s, 'reinforce'));
    s = ok(resolveActionPhase(s, { completed: [], failed: [] }));
    s = ok(endSol(s));
    expect(s.storm).toBeNull();
    expect(s.ledger.filter((entry) => entry.source.startsWith('storm:')).map((entry) => entry.label)).toEqual([
      'Radiation storm warning',
      'Reinforce the shielding for the storm',
      'Storm hits the reinforced shield',
    ]);
    expect(s.ledger.find((entry) => entry.label === 'Radiation storm warning')?.note).toMatch(/not a radiation forecast/);
    reconciles(s);
  });

  it('costs scale with severity', () => {
    expect(stormChoiceCost('reinforce', 3)).toEqual({ power: S.reinforcePowerPerSeverity.value * 3, water: S.reinforceWaterPerSeverity.value * 3 });
    expect(stormChoiceCost('shelter', 1)).toEqual({ research: S.shelterResearchPerSeverity.value });
  });

  it('the starting research can pay for sheltering from the strongest storm', () => {
    expect(C.start.research.value).toBeGreaterThanOrEqual(S.shelterResearchPerSeverity.value * 3);
  });
});

describe('storms in the sol flow', () => {
  const daySave = (sol: number): SolSave => {
    const save = newSolSave();
    return { ...save, state: { ...save.state, sol, phase: 'action' } };
  };

  it('a storm is due every few sols, during the day, once per sol', () => {
    const every = S.everySols.value;
    expect(stormIsDue(daySave(every), every)).toBe(true);
    expect(stormIsDue(daySave(every + 1), every)).toBe(false);
    expect(stormIsDue(newSolSave(), every)).toBe(false); // morning
    const announced = ok(announceStorm(daySave(every), flare()));
    expect(stormIsDue(announced, every)).toBe(false);
    const passed = { ...announced, state: ok(stormArrives(announced.state)) };
    expect(stormIsDue(passed, every)).toBe(false);
  });

  it('tells the child what the storm did in the evening summary', () => {
    let save = ok(planSol(newSolSave(), 'report-to-earth'));
    save = ok(announceStorm(save, flare(1)));
    const result = finishSol(save);
    expect(result.summary?.events).toContain('A radiation storm hit and the crew was not protected.');
  });

  it('loads saves from before storms existed, and rejects a broken storm', () => {
    const save = newSolSave();
    const { storm: _storm, stormEventsUsed: _used, ...old } = save.state;
    const revived = reviveSolSave({ ...save, state: old });
    expect(revived?.state.storm).toBeNull();
    expect(revived?.state.stormEventsUsed).toEqual([]);
    const withStorm = ok(announceStorm({ ...save, state: inAction() }, flare()));
    expect(reviveSolSave(JSON.parse(JSON.stringify(withStorm)))?.state.storm).toEqual(withStorm.state.storm);
    expect(reviveSolSave({ ...withStorm, state: { ...withStorm.state, storm: { severity: 9 } } })?.state.storm).toBeNull();
  });
});
