import { describe, expect, it } from 'vitest';
import { SOL_CONFIG as C } from '../../sol/config';
import { choose, createSolState, endDecisionPhase, endSol, resolveActionPhase, respondToStorm, startRadiationStorm, whyNot } from '../../sol/engine';
import type { Result, SolState } from '../../sol/types';
import { amountWords, badgeStatus, EMPTY_RECORD, mergeRecord, reviveRecord, badgesUsed, biggestTradeOff, isSmartChoice, plannerLessons, rankFor, scoreMission, solsSurvived, SURVIVAL_MAX } from './record';

const ok = <T,>(result: Result<T>): T => {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
};
function playSol(state: SolState, decisions: string[] = [], finish = true): SolState {
  let s = state;
  for (const id of decisions) if (whyNot(s, id) === null) s = ok(choose(s, id));
  s = ok(endDecisionPhase(s));
  const planned = s.plannedTasks.map((task) => task.taskId);
  s = ok(resolveActionPhase(s, finish ? { completed: planned, failed: [] } : { completed: [], failed: planned }));
  return s.status === 'active' ? ok(endSol(s)) : s;
}
const PLAN = ['exercise', 'report-to-earth', 'rest-day', 'report-to-earth', 'exercise', 'skip-maintenance'];
function goodMission(): SolState {
  let s = createSolState();
  while (s.status === 'active') s = playSol(s, [PLAN[(s.sol - 1) % PLAN.length]!]);
  return s;
}
function idleMission(): SolState {
  let s = createSolState();
  while (s.status === 'active') s = playSol(s);
  return s;
}

describe('the mission score', () => {
  it('rewards survival and good reasoning, out of 100', () => {
    const good = scoreMission(goodMission());
    expect(good.survival).toEqual({ points: SURVIVAL_MAX, max: SURVIVAL_MAX, sols: C.time.missionLengthSols.value });
    expect(good.total).toBe(good.survival.points + good.reasoning.points);
    expect(good.total).toBeLessThanOrEqual(100);
    expect(good.total).toBeGreaterThanOrEqual(70);
    expect(good.reasoning.parts.find((p) => p.id === 'follow-through')?.share).toBe(1);
  });

  it('a crew that does nothing scores low, even with stores left over', () => {
    const idle = idleMission();
    const score = scoreMission(idle);
    expect(idle.status).toBe('failed');
    expect(idle.resources.water).toBeGreaterThan(0);
    expect(score.total).toBeLessThan(scoreMission(goodMission()).total);
    expect(score.rating).not.toBe('Outstanding');
    expect(score.survival.sols).toBe(solsSurvived(idle));
  });

  it('does not count chances that never came (no storm, no plans)', () => {
    const score = scoreMission(goodMission());
    expect(score.reasoning.parts.find((p) => p.id === 'storm-ready')).toMatchObject({ share: null, detail: 'No storms this mission' });
  });

  it('counts unfinished urgent jobs against follow-through', () => {
    let s = createSolState();
    s = playSol(s, ['report-to-earth'], false);
    s = playSol(s, ['report-to-earth'], true);
    expect(scoreMission(s).reasoning.parts.find((p) => p.id === 'follow-through')).toMatchObject({ share: 0.5, detail: '1 of 2 urgent jobs' });
  });

  it('counts a protected storm as ready, an ignored one as not', () => {
    const storm = (choice: 'shelter' | null, id: string) => {
      let s = ok(endDecisionPhase(createSolState()));
      s = ok(startRadiationStorm(s, { event: { id, type: 'SEP', time: '2024-05-11T00:00:00Z', detail: 'x', link: null }, severity: 1, live: false, arrivesAtStationMinute: 10 }));
      if (choice) s = ok(respondToStorm(s, choice));
      return ok(endSol(ok(resolveActionPhase(s, { completed: [], failed: [] }))));
    };
    expect(scoreMission(storm('shelter', 'a')).reasoning.parts.find((p) => p.id === 'storm-ready')?.share).toBe(1);
    expect(scoreMission(storm(null, 'b')).reasoning.parts.find((p) => p.id === 'storm-ready')?.share).toBe(0);
  });

  it('a choice is smart when it tops up the lowest store or spends only from plenty', () => {
    const base = createSolState();
    // Power is the lowest store: spending it on the water recycler is not smart.
    const lowPower = ok(choose({ ...base, resources: { ...base.resources, power: 10 } }, 'push-water-recycler'));
    expect(isSmartChoice(lowPower, lowPower.ledger.length - 1)).toBe(false);
    // Power is plentiful: the same choice is smart.
    const plenty = ok(choose(base, 'push-water-recycler'));
    expect(isSmartChoice(plenty, plenty.ledger.length - 1)).toBe(true);
    // Shield is lowest: strengthening it is smart even though it costs power.
    const weakShield = ok(choose({ ...base, resources: { ...base.resources, shielding: 5, power: 20 } }, 'divert-power-greenhouse'));
    expect(isSmartChoice(weakShield, weakShield.ledger.length - 1)).toBe(true);
  });
});

describe('the biggest trade-off', () => {
  it('names the costliest choice with real amounts in read-aloud words', () => {
    const trade = biggestTradeOff(goodMission());
    expect(trade?.text).toMatch(/^On sol \d+, you chose "/);
    expect(trade?.text).toMatch(/You gave up .+ to get more /);
    expect(amountWords('power', 12)).toBe('12 kWh of power');
    expect(amountWords('crewHealth', 8)).toBe('8% crew health');
    expect(amountWords('research', 1)).toBe('1 science point');
  });

  it('explains a storm choice', () => {
    let s = ok(endDecisionPhase(createSolState()));
    s = ok(startRadiationStorm(s, { event: { id: 'x', type: 'SEP', time: '2024-05-11T00:00:00Z', detail: 'x', link: null }, severity: 3, live: false, arrivesAtStationMinute: 10 }));
    s = ok(respondToStorm(s, 'reinforce'));
    expect(biggestTradeOff(s)?.text).toBe('On sol 1, a radiation storm was coming. You gave up 30 kg of water and 24 kWh of power to reinforce the shield, so the storm could not hurt the crew as much.');
  });

  it('is empty when no choice was made', () => {
    expect(biggestTradeOff(createSolState())).toBeNull();
  });
});

describe('what real planners do', () => {
  it('gives three real practices, matched to the mission', () => {
    const idle = idleMission();
    const lessons = plannerLessons(idle, scoreMission(idle));
    expect(lessons).toHaveLength(3);
    expect(new Set(lessons.map((l) => l.id)).size).toBe(3);
    expect(lessons.at(-1)?.id).toBe('tradeoffs');
    expect(lessons.map((l) => l.id)).toContain('body');
  });
});

describe('concept badges', () => {
  it('need the concept learned in the Academy and used in the game', () => {
    const s = goodMission();
    const used = badgesUsed(s, { missionsCompleted: 0, daysSurvived: 0, stormsSheltered: 0, harvests: 0, repairs: 1, askedEarthFixes: 0, trainingFixes: 1 });
    expect(used.has('body-care')).toBe(true);
    expect(used.has('comms-delay')).toBe(true);
    expect(used.has('power-budget')).toBe(true);
    const none = badgeStatus([], used);
    expect(none.find((b) => b.id === 'comms-delay')).toMatchObject({ learned: false, used: true, earned: false });
    // Exercise and rest are not taught in a module, so using them is enough.
    expect(none.find((b) => b.id === 'body-care')?.earned).toBe(true);
    const learned = badgeStatus(['communication-and-emergencies'], used);
    expect(learned.find((b) => b.id === 'comms-delay')?.earned).toBe(true);
  });

  it('keeps badges that were saved earlier, even after a restart', () => {
    expect(badgeStatus([], new Set(), ['shielding']).find((b) => b.id === 'shielding')?.earned).toBe(true);
  });
});

describe('ranks', () => {
  it('climbs from Cadet with modules, badges and missions', () => {
    expect(rankFor(0, 0, 0, 0)).toMatchObject({ title: 'Cadet', next: { title: 'Crew Member', pointsNeeded: 3 } });
    expect(rankFor(3, 0, 0, 0).title).toBe('Crew Member');
    expect(rankFor(4, 2, 0, 0).title).toBe('Flight Engineer');
    expect(rankFor(8, 3, 0, 0).title).toBe('Mission Specialist');
  });

  it('Commander needs a completed mission with good reasoning, not just points', () => {
    expect(rankFor(8, 6, 0, 0)).toMatchObject({ title: 'Mission Specialist', next: { title: 'Commander', pointsNeeded: 0, extra: expect.stringMatching(/score of at least 60/) } });
    expect(rankFor(8, 6, 1, 40).title).toBe('Mission Specialist');
    expect(rankFor(8, 6, 1, 75)).toMatchObject({ title: 'Commander', next: null });
  });
});

describe('the saved record', () => {
  it('adds new badges and counts a finished mission once', () => {
    const first = mergeRecord(EMPTY_RECORD, ['shielding'], { missionId: 'm1', score: 72, complete: true })!;
    expect(first).toEqual({ badges: ['shielding'], bestScore: 72, missionsCompleted: 1, countedMissions: ['m1'] });
    expect(mergeRecord(first, ['shielding'], { missionId: 'm1', score: 90, complete: true })).toBeNull();
    const failed = mergeRecord(first, [], { missionId: 'm2', score: 40, complete: false })!;
    expect(failed).toMatchObject({ bestScore: 72, missionsCompleted: 1 });
  });

  it('cleans up whatever comes back from the database', () => {
    expect(reviveRecord(null)).toEqual(EMPTY_RECORD);
    expect(reviveRecord({ badges: ['a', 3], bestScore: 400, missionsCompleted: -2 })).toEqual({ badges: ['a'], bestScore: 100, missionsCompleted: 0, countedMissions: [] });
  });
});
