import { describe, expect, it } from 'vitest';
import { completeJob, finishSol, newSolSave, planSol, reviveSolSave, skipTutorial, type SolSave } from './solFlow';
import { tutorialStep } from './tutorial';

const ok = (result: { ok: boolean; state?: SolSave }) => {
  if (!result.ok || !result.state) throw new Error('refused');
  return result.state;
};

describe('the tutorial sol', () => {
  it('walks through the first sol step by step, following the saved game', () => {
    let save = newSolSave();
    expect(tutorialStep(save, false)?.id).toBe('walk-to-console');
    expect(tutorialStep(save, true)?.id).toBe('choose-plan');
    save = ok(planSol(save, 'report-to-earth'));
    expect(tutorialStep(save, false)).toMatchObject({ id: 'do-the-job', text: expect.stringContaining('Antenna Console') });
    save = completeJob(save, 'earth-report');
    expect(tutorialStep(save, false)?.id).toBe('end-the-sol');
    const finished = finishSol(save);
    expect(finished.ok && finished.state.tutorialDone).toBe(true);
    expect(tutorialStep(ok(finished), false)).toBeNull();
  });

  it('can be skipped, and is not shown again', () => {
    expect(tutorialStep(skipTutorial(newSolSave()), false)).toBeNull();
  });

  it('old saves past the first sol skip the tutorial; new missions get an id', () => {
    const save = newSolSave();
    const { tutorialDone: _t, missionId: _m, ...old } = save;
    expect(reviveSolSave({ ...old, state: { ...save.state, sol: 4 } })?.tutorialDone).toBe(true);
    expect(reviveSolSave(old)?.missionId).toBe('mission-before-records');
    expect(newSolSave().missionId).not.toBe(newSolSave().missionId);
  });
});
