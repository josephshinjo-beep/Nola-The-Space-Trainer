import { describe, expect, it } from 'vitest';
import { CURRICULUM } from '../features/academy/curriculum';
import { LESSON_MODULE_IDS, loadLesson } from '../features/academy/content';
import { EMPTY_PROGRESS, isQuizPass, moduleStatus, nextModule, type ProgressMap } from '../features/academy/progress';
import { computeAchievements } from '../features/academy/achievements';
import { getUnlockedSystems, isSystemUnlocked, SYSTEM_IDS, type SystemId } from '../features/unlocks/unlockManager';
import { SIM } from './config';
import { applyAction, createInitialState, DEFAULT_INPUTS, energyFlow, getStationStats, recover, reviveState, step, syncUnlocks } from './engine';
import { currentMission, MISSIONS } from './missions';
import type { Action, StationState } from './types';

const ALL: SystemId[] = [...SYSTEM_IDS];
const act = (state: StationState, action: Action) => applyAction(state, action).state;
const done = (id: string): ProgressMap => ({ [id]: { ...EMPTY_PROGRESS, completed: true, quizPassed: true, challengeDone: true } });

describe('unlock manager', () => {
  it('unlocks nothing for a new student and everything for a graduate', () => {
    expect(getUnlockedSystems([])).toEqual([]);
    expect(getUnlockedSystems(CURRICULUM.map((m) => m.id))).toEqual(ALL);
  });

  it('maps each lesson to its own system only', () => {
    expect(getUnlockedSystems(['water-and-recycling'])).toEqual(['water']);
    expect(isSystemUnlocked('oxygen', ['water-and-recycling'])).toBe(false);
    expect(getUnlockedSystems(['not-a-module'])).toEqual([]);
  });

  it('covers every system with exactly one module and one mission', () => {
    for (const system of SYSTEM_IDS) {
      expect(CURRICULUM.filter((m) => m.unlock.systemId === system)).toHaveLength(1);
      expect(MISSIONS.filter((m) => m.system === system)).toHaveLength(1);
    }
  });
});

describe('academy progress rules', () => {
  it('needs 80% to pass a quiz', () => {
    expect(isQuizPass(4, 5)).toBe(true);
    expect(isQuizPass(3, 5)).toBe(false);
    expect(isQuizPass(0, 0)).toBe(false);
  });

  it('opens modules one at a time, in order', () => {
    const [first, second, third] = CURRICULUM;
    expect(moduleStatus(first!, {})).toBe('available');
    expect(moduleStatus(second!, {})).toBe('locked');
    const afterOne = done(first!.id);
    expect(moduleStatus(first!, afterOne)).toBe('completed');
    expect(moduleStatus(second!, afterOne)).toBe('available');
    expect(moduleStatus(third!, afterOne)).toBe('locked');
    expect(moduleStatus(second!, { ...afterOne, [second!.id]: { ...EMPTY_PROGRESS, stage: 2 } })).toBe('in-progress');
    expect(nextModule(afterOne)?.id).toBe(second!.id);
  });

  it('awards achievements from real records only', () => {
    const none = computeAchievements({}, null);
    expect(none.every((a) => !a.earned)).toBe(true);
    const some = computeAchievements({ x: EMPTY_PROGRESS, ...{ [CURRICULUM[0]!.id]: { ...EMPTY_PROGRESS, completed: true, attempts: 1, bestScore: 5, quizTotal: 5 } } }, { missionsCompleted: 1, daysSurvived: 0, stormsSheltered: 0, harvests: 1, repairs: 0 });
    const earned = some.filter((a) => a.earned).map((a) => a.id);
    expect(earned).toEqual(expect.arrayContaining(['first-steps', 'perfect', 'first-try', 'first-mission', 'farmer']));
    expect(earned).not.toContain('graduate');
  });
});

describe('lesson content', () => {
  it('has a complete, well-formed lesson for every module', async () => {
    expect(LESSON_MODULE_IDS.sort()).toEqual(CURRICULUM.map((m) => m.id).sort());
    for (const module of CURRICULUM) {
      const lesson = await loadLesson(module.id);
      expect(lesson.moduleId).toBe(module.id);
      expect(lesson.intro.length).toBeGreaterThanOrEqual(2);
      expect(lesson.cards.length).toBeGreaterThanOrEqual(5);
      expect(lesson.quiz.length).toBe(5);
      for (const q of lesson.quiz) {
        expect(q.options.length).toBe(4);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(4);
        expect(new Set(q.options).size).toBe(4);
      }
      for (const s of lesson.challenge.steps) expect(s.options.filter((o) => o.correct)).toHaveLength(1);
      if (lesson.explore.kind === 'sort') {
        const bins = lesson.explore.bins.map((b) => b.id);
        for (const item of lesson.explore.items) expect(bins).toContain(item.bin);
      }
    }
  });

  it('has slider activities that start unsolved and can be solved', async () => {
    const solutions: Record<string, Record<string, number>> = {
      'oxygen-and-breathing': { crew: 4, generator: 80, scrubber: 80 },
      'food-and-agriculture': { light: 16, water: 60, nutrients: 50 },
      'energy-and-electricity': { angle: 0, systems: 4 },
      'radiation-protection': { thickness: 40, outside: 0 },
      'temperature-and-life-support': { sun: 100, heater: 0, radiator: 70 },
      'communication-and-emergencies': { distance: 55 },
    };
    for (const [id, solution] of Object.entries(solutions)) {
      const { explore } = await loadLesson(id);
      if (explore.kind !== 'slider') throw new Error(`${id} should be a slider activity`);
      const initial = Object.fromEntries(explore.sliders.map((s) => [s.id, s.initial]));
      expect(explore.compute(initial).success, `${id} starts unsolved`).toBe(false);
      expect(explore.compute(solution).success, `${id} is solvable`).toBe(true);
    }
  });

  it('uses the real speed of light for signal delay', async () => {
    const { explore } = await loadLesson('communication-and-emergencies');
    if (explore.kind !== 'slider') throw new Error('expected slider');
    expect(explore.compute({ distance: 0 }).readouts[1]?.value).toBe('1.3 seconds');
    expect(explore.compute({ distance: 400 }).readouts[1]?.value).toBe('22 min 14 s');
  });
});

describe('simulation engine', () => {
  it('is deterministic: the same start and inputs give the same result', () => {
    const run = () => {
      let s = createInitialState(ALL, 42);
      s = act(s, { type: 'toggleMachine', machine: 'oxygenGenerator' });
      return step(s, 3000);
    };
    expect(run()).toEqual(run());
  });

  it('does not change the state it is given', () => {
    const start = createInitialState(ALL);
    const snapshot = JSON.stringify(start);
    step(start, 600);
    applyAction(start, { type: 'deployPanels' });
    expect(JSON.stringify(start)).toBe(snapshot);
  });

  it('holds locked systems steady on autopilot', () => {
    const s = step(createInitialState(['station-access']), 5000);
    expect(s.resources).toEqual({ oxygen: 80, water: 80, food: 80, energy: 80 });
    expect(s.temperature).toBe(SIM.comfortTemperature);
    expect(s.faults).toEqual([]);
    expect(s.storm).toBeNull();
    expect(s.health).toBe(100);
  });

  it('uses up oxygen unless the generator runs', () => {
    const base = createInitialState(['station-access', 'oxygen']);
    const off = step(base, 120);
    expect(off.resources.oxygen).toBeCloseTo(80 - 2 * SIM.crewOxygenPerHour, 5);
    const on = step(act(base, { type: 'toggleMachine', machine: 'oxygenGenerator' }), 120);
    expect(on.resources.oxygen).toBeGreaterThan(80);
  });

  it('refuses to operate locked systems', () => {
    const base = createInitialState(['station-access']);
    for (const action of [{ type: 'toggleMachine', machine: 'oxygenGenerator' }, { type: 'deployPanels' }, { type: 'plant' }, { type: 'requestSupply' }, { type: 'checkMonitor' }] as Action[]) {
      const result = applyAction(base, action);
      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/locked/);
      expect(result.state).toBe(base);
    }
  });

  it('saves most water when the recycler runs', () => {
    const base = { ...createInitialState(['station-access', 'water']), nextEventAt: 1e9 };
    const without = 80 - step(base, 600).resources.water;
    const withRecycler = 80 - step(act(base, { type: 'toggleMachine', machine: 'waterRecycler' }), 600).resources.water;
    expect(withRecycler).toBeCloseTo(without * (1 - SIM.recyclerRecovery), 5);
  });

  it('makes solar power only in sunlight, and stops machines when the battery is flat', () => {
    let s = createInitialState(['station-access', 'oxygen', 'energy']);
    expect(energyFlow(s).generation).toBe(0);
    s = act(s, { type: 'deployPanels' });
    expect(energyFlow({ ...s, minutes: 10 }).generation).toBe(SIM.solarEnergyPerHour);
    expect(energyFlow({ ...s, minutes: SIM.sunlitMinutes + 5 }).generation).toBe(0);

    const flat = { ...act(createInitialState(['station-access', 'oxygen', 'energy']), { type: 'toggleMachine', machine: 'oxygenGenerator' }), resources: { oxygen: 50, water: 80, food: 80, energy: 0 } };
    expect(step(flat, 60).resources.oxygen).toBeLessThan(50);
  });

  it('keeps a positive energy balance over a full orbit with everything running', () => {
    let s = createInitialState(ALL);
    for (const a of [{ type: 'deployPanels' }, { type: 'toggleMachine', machine: 'oxygenGenerator' }, { type: 'toggleMachine', machine: 'waterRecycler' }, { type: 'toggleMachine', machine: 'thermalControl' }, { type: 'plant' }] as Action[]) s = act(s, a);
    s = { ...s, resources: { ...s.resources, energy: 50 }, nextEventAt: 1e9, triggered: MISSIONS.flatMap((m) => m.tasks.map((t) => t.id)) };
    expect(step(s, SIM.orbitMinutes).resources.energy).toBeGreaterThan(50);
  });

  it('grows a crop over time and adds food at harvest', () => {
    let s = act({ ...createInitialState(['station-access', 'food']), nextEventAt: 1e9 }, { type: 'plant' });
    expect(applyAction(s, { type: 'harvest' }).ok).toBe(false);
    s = step(s, SIM.cropGrowHours * 60 + 10);
    expect(s.crop.stage).toBe('ready');
    s = { ...s, resources: { ...s.resources, food: 40 } };
    const before = s.resources.food;
    s = act(s, { type: 'harvest' });
    expect(s.resources.food).toBeCloseTo(before + SIM.harvestFood, 5);
    expect(s.crop.stage).toBe('empty');
    expect(getStationStats(s).harvests).toBe(1);
  });

  it('lets temperature drift without thermal control and holds it with control', () => {
    const base = { ...createInitialState(['station-access', 'temperature']), nextEventAt: 1e9 };
    expect(step(base, 30).temperature).toBeGreaterThan(SIM.comfortTemperature);
    const controlled = step(act(base, { type: 'toggleMachine', machine: 'thermalControl' }), 400);
    expect(controlled.temperature).toBe(SIM.comfortTemperature);
  });

  it('protects the crew in the shelter during a storm', () => {
    const calm = { ...createInitialState(['station-access', 'radiation']), nextEventAt: 1e9 };
    const stormy: StationState = { ...calm, storm: { endsAt: 200, intensity: 3, minutesExposed: 0, minutesTotal: 0 } };
    const outside = step(stormy, 120, { ...DEFAULT_INPUTS, inShelter: false });
    const inside = step(stormy, 120, { ...DEFAULT_INPUTS, inShelter: true });
    expect(outside.health).toBeLessThan(100);
    expect(inside.health).toBe(100);
    expect(inside.radiation).toBeLessThan(outside.radiation);
    const after = step(stormy, 240, { ...DEFAULT_INPUTS, inShelter: true });
    expect(after.storm).toBeNull();
    expect(after.stats.stormsSheltered).toBe(1);
  });

  it('walks through missions as tasks are done, creating the fault to repair', () => {
    let s = createInitialState(['station-access', 'oxygen']);
    expect(currentMission(s)?.id).toBe('find-your-feet');
    s = act(s, { type: 'useConsole' });
    s = act(s, { type: 'visit', room: 'medical' });
    s = act(s, { type: 'heal' });
    expect(currentMission(s)?.id).toBe('breathe-easy');
    expect(s.faults).not.toContain('co2-filter');
    s = act(s, { type: 'toggleMachine', machine: 'oxygenGenerator' });
    expect(s.faults).toContain('co2-filter');
    s = act(s, { type: 'repair', fault: 'co2-filter' });
    expect(currentMission(s)).toBeNull();
    expect(getStationStats(s).missionsCompleted).toBe(2);
    expect(applyAction(s, { type: 'repair', fault: 'co2-filter' }).ok).toBe(false);
  });

  it('keeps a mission repair possible after an emergency recovery clears the fault', () => {
    let s = createInitialState(['station-access', 'oxygen']);
    for (const a of [{ type: 'useConsole' }, { type: 'visit', room: 'medical' }, { type: 'heal' }, { type: 'toggleMachine', machine: 'oxygenGenerator' }] as Action[]) s = act(s, a);
    expect(s.faults).toContain('co2-filter');
    const recovered = recover({ ...s, status: 'failed', health: 0 });
    expect(recovered.faults).toContain('co2-filter');
    expect(currentMission(act(recovered, { type: 'repair', fault: 'co2-filter' }))).toBeNull();
    // Also if the fault simply went missing from a saved game.
    expect(step({ ...s, faults: [] }, 5).faults).toContain('co2-filter');
  });

  it('adds new systems to a saved game when more lessons are passed', () => {
    const saved = step(createInitialState(['station-access']), 100);
    const synced = syncUnlocks(saved, ['station-access', 'oxygen']);
    expect(synced.unlocked).toEqual(['station-access', 'oxygen']);
    expect(synced.log.at(-1)?.text).toMatch(/Oxygen Control is now unlocked/);
    expect(syncUnlocks(synced, ['station-access', 'oxygen'])).toBe(synced);
  });

  it('fails gently when the crew is neglected, and can recover', () => {
    const neglected = { ...createInitialState(ALL), nextEventAt: 1e9, nextSupplyAt: 1e9 };
    const failed = step(neglected, 20 * 24 * 60);
    expect(failed.status).toBe('failed');
    expect(step(failed, 100)).toBe(failed);
    const back = recover(failed);
    expect(back.status).toBe('running');
    expect(back.health).toBeGreaterThan(0);
    expect(back.completedTasks).toEqual(failed.completedTasks);
  });

  it('delivers supplies on schedule and on request', () => {
    let s = { ...createInitialState(ALL), nextEventAt: 1e9, triggered: MISSIONS.flatMap((m) => m.tasks.map((t) => t.id)) };
    s = { ...s, resources: { ...s.resources, water: 20, food: 20 } };
    const requested = applyAction(s, { type: 'requestSupply' });
    expect(requested.ok).toBe(true);
    expect(applyAction(requested.state, { type: 'requestSupply' }).ok).toBe(false);
    const arrived = step(requested.state, 125);
    expect(arrived.resources.food).toBeGreaterThan(20 + SIM.supplyFood - 3);
  });

  it('survives a save and load round trip, and rejects bad data', () => {
    const s = step(act(createInitialState(ALL, 7), { type: 'deployPanels' }), 500);
    expect(reviveState(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(reviveState(null)).toBeNull();
    expect(reviveState({ version: 2 })).toBeNull();
    expect(reviveState({ ...s, resources: { oxygen: 'lots' } })).toBeNull();
  });

  it('keeps every value in range over a long, eventful run', () => {
    let s = createInitialState(ALL, 99);
    for (const a of [{ type: 'deployPanels' }, { type: 'toggleMachine', machine: 'oxygenGenerator' }, { type: 'toggleMachine', machine: 'waterRecycler' }, { type: 'toggleMachine', machine: 'thermalControl' }] as Action[]) s = act(s, a);
    for (let i = 0; i < 400; i++) {
      s = step(s, 30, { inShelter: i % 3 === 0, spaceWeather: { stormChance: 3, stormIntensity: 3 } });
      if (s.status === 'failed') s = recover(s);
      for (const fault of s.faults) if (i % 5 === 0) s = act(s, { type: 'repair', fault });
      for (const value of Object.values(s.resources)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
      expect(s.health).toBeGreaterThanOrEqual(0);
      expect(s.health).toBeLessThanOrEqual(100);
      expect(Number.isFinite(s.temperature)).toBe(true);
      expect(s.faults.length).toBeLessThanOrEqual(SIM.maxFaultsAtOnce + 1);
      expect(s.log.length).toBeLessThanOrEqual(SIM.logLength);
    }
    expect(s.stats.repairs).toBeGreaterThan(0);
  });
});
