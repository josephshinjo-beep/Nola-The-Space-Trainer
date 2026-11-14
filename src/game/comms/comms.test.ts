import { describe, expect, it } from 'vitest';
import { SIM } from '../../simulation/config';
import { applyAction, createInitialState, earthWaitMinutes, reviveState, step } from '../../simulation/engine';
import { SYSTEM_IDS } from '../../features/unlocks/unlockManager';
import type { Action, FaultId, StationState } from '../../simulation/types';
import { callProgress, lostWhileWaiting, planCall } from './comms';
import { earthMarsKm, formatClock, formatDelay, LIGHT_KM_S, siteLink } from './delay';
import { PROCEDURES } from './procedures';

const act = (state: StationState, action: Action) => {
  const result = applyAction(state, action);
  if (!result.ok) throw new Error(result.message);
  return result.state;
};
const withFault = (fault: FaultId, site: 'moon' | 'mars' | null = 'mars'): StationState => {
  const state = createInitialState(SYSTEM_IDS);
  return { ...state, faults: [fault], site, nextEventAt: 1e9 };
};
const MARS_ONE_WAY = 660; // 11 minutes, today's value (14 Nov 2026)

describe('real signal delays', () => {
  it('matches known Earth–Mars distances (closest approaches recorded by NASA)', () => {
    // 27 Aug 2003: 55.76 million km, the closest in nearly 60,000 years.
    expect(earthMarsKm(new Date('2003-08-27T09:51Z')) / 1e6).toBeCloseTo(55.76, 0);
    // 31 Jul 2018: 57.6 million km. 6 Oct 2020: 62.07 million km. 1 Dec 2022: 81.45 million km.
    expect(earthMarsKm(new Date('2018-07-31T08:00Z')) / 1e6).toBeCloseTo(57.6, 0);
    expect(earthMarsKm(new Date('2020-10-06T14:00Z')) / 1e6).toBeCloseTo(62.07, 0);
    expect(earthMarsKm(new Date('2022-12-01T00:00Z')) / 1e6).toBeCloseTo(81.45, 0);
  });

  it('keeps Mars between 3 and 22.3 minutes one way, every day from 2000 to 2050', () => {
    let low = Infinity;
    let high = 0;
    for (let t = Date.parse('2000-01-01'); t < Date.parse('2050-01-01'); t += 86_400_000) {
      const seconds = siteLink('mars', new Date(t)).oneWaySeconds;
      low = Math.min(low, seconds);
      high = Math.max(high, seconds);
    }
    expect(low / 60).toBeGreaterThan(3);
    expect(high / 60).toBeLessThan(22.3);
    expect(high / 60).toBeGreaterThan(21.5);
  });

  it('gives the Moon about 1.3 seconds, and accepts every real Mars value', () => {
    expect(siteLink('moon').oneWaySeconds).toBeCloseTo(384_400 / LIGHT_KM_S, 6);
    expect(formatDelay(siteLink('moon').oneWaySeconds)).toBe('1.3 seconds');
    const [low, high] = SIM.earthDelayRange.mars;
    expect(low).toBeLessThan(54_600_000 / LIGHT_KM_S);
    expect(high).toBeGreaterThan(401_000_000 / LIGHT_KM_S);
  });

  it('formats delays and the countdown clock', () => {
    expect(formatDelay(750)).toBe('12 min 30 s');
    expect(formatClock(1320)).toBe('22:00');
    expect(formatClock(2.56)).toBe('0:02.6');
    expect(formatClock(-1)).toBe('0:00.0');
  });
});

describe('the wait for Mission Control', () => {
  it('plays a Mars round trip at station speed, keeping the real number', () => {
    const plan = planCall(MARS_ONE_WAY);
    expect(plan.realRoundTripSeconds).toBe(1320);
    expect(earthWaitMinutes(MARS_ONE_WAY)).toBe(22); // 22 real minutes of delay = 22 station minutes
    expect(plan.playSecondsLeft).toBe(11);
    expect(plan.speedUp).toBe(120);
  });

  it('plays the Moon in real time, so the short delay is still visible', () => {
    const plan = planCall(1.28);
    expect(plan.playSecondsLeft).toBeCloseTo(2.56);
    expect(plan.speedUp).toBeCloseTo(1);
  });

  it('counts down the real delay as station time passes, and the reply arrives on time', () => {
    let s = act(withFault('water-leak'), { type: 'askEarth', fault: 'water-leak', oneWaySeconds: MARS_ONE_WAY });
    const call = s.earthCalls[0]!;
    expect(callProgress(call, s.minutes).realSecondsLeft).toBe(1320);
    s = step(s, 11);
    expect(callProgress(s.earthCalls[0]!, s.minutes).realSecondsLeft).toBeCloseTo(660);
    expect(s.earthCalls[0]!.replied).toBe(false);
    s = step(s, 11);
    expect(s.earthCalls[0]!.replied).toBe(true);
    expect(s.log.at(-1)?.text).toMatch(/Mission Control has replied/);
  });

  it('the problem keeps draining while the crew waits', () => {
    let s = act(withFault('water-leak'), { type: 'askEarth', fault: 'water-leak', oneWaySeconds: 1300 });
    s = step(s, earthWaitMinutes(1300));
    const { resource, lost } = lostWhileWaiting(s.earthCalls[0]!, s);
    expect(resource).toBe('water');
    // The leak alone wastes leakWaterPerHour; the crew drinks on top of that.
    expect(lost).toBeGreaterThanOrEqual((SIM.leakWaterPerHour * earthWaitMinutes(1300)) / 60);
  });

  it('no reply gets through while the antenna is down', () => {
    let s = act(withFault('co2-filter'), { type: 'askEarth', fault: 'co2-filter', oneWaySeconds: MARS_ONE_WAY });
    s = { ...s, faults: [...s.faults, 'antenna'] };
    s = step(s, 60);
    expect(s.earthCalls[0]!.replied).toBe(false);
    s = act(s, { type: 'repair', fault: 'antenna' });
    s = step(s, 5);
    expect(s.earthCalls[0]!.replied).toBe(true);
  });

  it('refuses calls that make no sense', () => {
    const refused = (state: StationState, action: Action) => applyAction(state, action).message;
    expect(refused(withFault('water-leak', null), { type: 'askEarth', fault: 'water-leak', oneWaySeconds: 1.3 })).toMatch(/Choose where your base is/);
    expect(refused(withFault('antenna'), { type: 'askEarth', fault: 'antenna', oneWaySeconds: MARS_ONE_WAY })).toMatch(/No signal/);
    expect(refused(withFault('water-leak', 'moon'), { type: 'askEarth', fault: 'water-leak', oneWaySeconds: MARS_ONE_WAY })).toMatch(/does not match/);
    expect(refused(withFault('water-leak'), { type: 'askEarth', fault: 'co2-filter', oneWaySeconds: MARS_ONE_WAY })).toMatch(/already fixed/);
    const asked = act(withFault('water-leak'), { type: 'askEarth', fault: 'water-leak', oneWaySeconds: MARS_ONE_WAY });
    expect(refused(asked, { type: 'askEarth', fault: 'water-leak', oneWaySeconds: MARS_ONE_WAY })).toMatch(/already asked/);
    expect(refused(asked, { type: 'chooseSite', site: 'moon' })).toMatch(/Wait for Mission Control/);
  });

  it('fixing the problem clears its call', () => {
    const asked = act(withFault('water-leak'), { type: 'askEarth', fault: 'water-leak', oneWaySeconds: MARS_ONE_WAY });
    expect(act(asked, { type: 'repair', fault: 'water-leak' }).earthCalls).toEqual([]);
  });

  it('a wrong step on your own training wastes some of the right store', () => {
    const s = withFault('co2-filter');
    expect(act(s, { type: 'trainingMistake', fault: 'co2-filter' }).resources.oxygen).toBe(s.resources.oxygen - SIM.trainingMistakeLoss);
    const leak = withFault('water-leak');
    expect(act(leak, { type: 'trainingMistake', fault: 'water-leak' }).resources.water).toBe(leak.resources.water - SIM.trainingMistakeLoss);
  });

  it('loads games saved before Earth communication existed', () => {
    const { site: _site, earthCalls: _calls, ...old } = createInitialState(SYSTEM_IDS);
    const revived = reviveState(JSON.parse(JSON.stringify(old)));
    expect(revived?.site).toBeNull();
    expect(revived?.earthCalls).toEqual([]);
  });
});

describe('training questions', () => {
  it('every problem has exactly one right answer, a reason for every option, and a Mission Control reply where Earth can hear', () => {
    for (const [fault, procedure] of Object.entries(PROCEDURES)) {
      expect(procedure.options.filter((option) => option.correct), fault).toHaveLength(1);
      for (const option of procedure.options) expect(option.why.length, `${fault}: ${option.text}`).toBeGreaterThan(20);
      if (fault === 'antenna') expect(procedure.earthReply).toBe('');
      else expect(procedure.earthReply).toMatch(/^Mission Control:/);
    }
  });
});
