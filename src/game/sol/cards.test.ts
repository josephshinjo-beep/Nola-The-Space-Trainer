import { describe, expect, it } from 'vitest';
import { SYSTEM_IDS, type SystemId } from '../../features/unlocks/unlockManager';
import { SOL_CONFIG } from '../../sol/config';
import { DECISIONS, findDecision } from '../../sol/decisions';
import { createSolState } from '../../sol/engine';
import type { SolState } from '../../sol/types';
import { EQUIPMENT, findRoom } from '../stationMap';
import { cardsCoverAllDecisions, KID_CARDS, pickCards } from './cards';
import { completeJob, finishSol, newSolSave, planSol, reviveSolSave, skipPlanning, urgentJob, type SolSave } from './solFlow';

const ALL: SystemId[] = [...SYSTEM_IDS];
const STARTER: SystemId[] = ['station-access'];
const words = (text: string) => text.trim().split(/\s+/).length;

function ok<T>(result: { ok: true; state: T } | { ok: false; reason: string }): T {
  if (!result.ok) throw new Error(`Refused: ${result.reason}`);
  return result.state;
}

describe('kid cards', () => {
  it('has one card for every decision', () => {
    expect(cardsCoverAllDecisions()).toBe(true);
    expect(KID_CARDS).toHaveLength(DECISIONS.length);
    expect(new Set(KID_CARDS.map((c) => c.decisionId)).size).toBe(KID_CARDS.length);
  });

  it('"You gain" and "You lose" name exactly what the decision really gives and takes', () => {
    for (const card of KID_CARDS) {
      const decision = findDecision(card.decisionId)!;
      expect(card.gain.map((l) => l.resource).sort(), card.decisionId).toEqual(Object.keys(decision.gains).sort());
      expect(card.lose.map((l) => l.resource).sort(), card.decisionId).toEqual([...Object.keys(decision.costs), ...Object.keys(decision.deferredCosts ?? {})].sort());
      // Losses that happen tonight say so.
      for (const line of card.lose) expect(Boolean(line.tonight), `${card.decisionId} ${line.resource}`).toBe(line.resource in (decision.deferredCosts ?? {}));
      // Every card loses something: no free choices for children either.
      expect(card.lose.length, card.decisionId).toBeGreaterThan(0);
    }
  });

  it('uses short, simple sentences for ages 7 to 12', () => {
    for (const card of KID_CARDS) {
      expect(words(card.title), card.title).toBeLessThanOrEqual(5);
      for (const line of [...card.gain, ...card.lose]) expect(words(line.text), line.text).toBeLessThanOrEqual(9);
      expect(words(card.urgent.text), card.urgent.text).toBeLessThanOrEqual(10);
      // "Why this is real" is one sentence, kept short.
      expect(card.whyReal.match(/[.!?]/g)?.length, card.whyReal).toBe(1);
      expect(words(card.whyReal), card.whyReal).toBeLessThanOrEqual(20);
    }
  });

  it('puts every urgent job at a real machine, in a room opened by the right Academy system', () => {
    for (const card of KID_CARDS) {
      const machine = EQUIPMENT.find((e) => e.id === card.urgent.equipment);
      expect(machine, card.decisionId).toBeDefined();
      expect(findRoom(machine!.room).system, card.decisionId).toBe(card.urgent.system);
      expect(machine!.id, card.decisionId).not.toBe('console');
    }
  });
});

describe('picking the three cards', () => {
  it('shows three different cards a player can afford, in unlocked rooms only', () => {
    const cards = pickCards(createSolState(), ALL);
    expect(cards).toHaveLength(3);
    expect(new Set(cards.map((c) => c.decisionId)).size).toBe(3);
  });

  it('gives a brand-new player the three Med Station plans', () => {
    const cards = pickCards(createSolState(), STARTER);
    expect(cards.map((c) => c.decisionId).sort()).toEqual(['extra-research-task', 'rest-day', 'skip-maintenance']);
    expect(cards.every((c) => c.urgent.equipment === 'medstation')).toBe(true);
  });

  it('never offers a card whose machine is locked', () => {
    for (const system of ALL) {
      const unlocked: SystemId[] = ['station-access', system];
      for (const card of pickCards(createSolState(), unlocked)) expect(unlocked, card.decisionId).toContain(card.urgent.system);
    }
  });

  it('puts what the station needs most first', () => {
    const base = createSolState();
    const weakShield: SolState = { ...base, resources: { ...base.resources, shielding: 5 } };
    expect(Object.keys(findDecision(pickCards(weakShield, ALL)[0]!.decisionId)!.gains)).toContain('shielding');
    const tired: SolState = { ...base, resources: { ...base.resources, crewHealth: 20 } };
    expect(Object.keys(findDecision(pickCards(tired, ALL)[0]!.decisionId)!.gains)).toContain('crewHealth');
  });

  it('tries to help with three different things', () => {
    const cards = pickCards(createSolState(), ALL);
    const helps = cards.map((c) => Object.keys(findDecision(c.decisionId)!.gains)[0]);
    expect(new Set(helps).size).toBe(3);
  });

  it('leaves out cards the crew cannot afford', () => {
    const base = createSolState();
    const noFood: SolState = { ...base, resources: { ...base.resources, food: 0 } };
    expect(pickCards(noFood, STARTER).map((c) => c.decisionId)).not.toContain('rest-day');
  });

  it('is the same every time for the same state', () => {
    const s = createSolState();
    expect(pickCards(s, ALL).map((c) => c.decisionId)).toEqual(pickCards(s, ALL).map((c) => c.decisionId));
  });
});

describe('the sol flow', () => {
  it('plan, do the urgent job, end the sol: the job decides the reward', () => {
    let save = ok(planSol(newSolSave(), 'rest-day'));
    expect(save.state.phase).toBe('action');
    const job = urgentJob(save)!;
    expect(job).toMatchObject({ taskId: 'rest-checkup', done: false });
    expect(job.card.urgent.equipment).toBe('medstation');
    expect(save.state.resources.food).toBe(SOL_CONFIG.start.food.value - 1.5);

    save = completeJob(save, job.taskId);
    expect(urgentJob(save)!.done).toBe(true);
    const result = finishSol(save);
    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({ sol: 1, jobDone: true, cardGave: { crewHealth: 6 }, cardCost: { food: 1.5 }, missionOver: null });
    expect(result.summary!.events).toContain('The crew had a good night and feels better.');
    const next = ok(result);
    expect(next.state).toMatchObject({ sol: 2, phase: 'decision' });
    expect(next.doneTasks).toEqual([]);
  });

  it('skipping the urgent job keeps the loss but gives nothing', () => {
    const save = ok(planSol(newSolSave(), 'extra-research-task'));
    const result = finishSol(save);
    expect(result.summary).toMatchObject({ jobDone: false, cardGave: {}, cardCost: { oxygen: 2 } });
    expect(ok(result).state.resources.research).toBe(SOL_CONFIG.start.research.value);
  });

  it('a night cost shows up in the summary of the plan that caused it', () => {
    const save = completeJob(ok(planSol(newSolSave(), 'divert-power-heating')), 'heater-down');
    expect(finishSol(save).summary).toMatchObject({ cardGave: { shielding: 12 }, cardCost: { power: 12, crewHealth: 5 } });
  });

  it('ignores marking a job that is not today\'s, or marking it twice', () => {
    const save = ok(planSol(newSolSave(), 'rest-day'));
    expect(completeJob(save, 'shield-repair')).toBe(save);
    const once = completeJob(save, 'rest-checkup');
    expect(completeJob(once, 'rest-checkup')).toBe(once);
  });

  it('allows one plan per sol from the briefing, or resting when nothing is affordable', () => {
    const save = ok(planSol(newSolSave(), 'rest-day'));
    expect(planSol(save, 'skip-maintenance')).toMatchObject({ ok: false });
    const rested = ok(skipPlanning(newSolSave()));
    expect(urgentJob(rested)).toBeNull();
    expect(finishSol(rested).summary).toMatchObject({ card: null, jobDone: false });
  });

  it('survives a save and load, and rejects broken saves', () => {
    const save: SolSave = completeJob(ok(planSol(newSolSave(), 'rest-day')), 'rest-checkup');
    expect(reviveSolSave(JSON.parse(JSON.stringify(save)))).toEqual(save);
    expect(reviveSolSave(null)).toBeNull();
    expect(reviveSolSave({ version: 2 })).toBeNull();
    expect(reviveSolSave({ ...save, state: { ...save.state, resources: { oxygen: 'lots' } } })).toBeNull();
  });

  it('runs a whole mission through the briefing flow', () => {
    let save = newSolSave();
    let summaries = 0;
    while (save.state.status === 'active') {
      const card = pickCards(save.state, ALL)[0];
      save = card ? ok(planSol(save, card.decisionId)) : ok(skipPlanning(save));
      const job = urgentJob(save);
      if (job) save = completeJob(save, job.taskId);
      const result = finishSol(save);
      expect(result.ok).toBe(true);
      summaries += 1;
      save = ok(result);
    }
    expect(summaries).toBe(SOL_CONFIG.time.missionLengthSols.value);
    expect(save.state.status).toBe('complete');
  });
});
