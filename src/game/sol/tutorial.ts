import { findEquipment } from '../stationMap';
import { urgentJob, type SolSave } from './solFlow';

/**
 * The tutorial sol: the first sol of a mission, with NOLA explaining each
 * step. Worked out from the saved game, so it always matches what the
 * player sees, and it picks up where they left off after a reload.
 */
export type TutorialStepId = 'walk-to-console' | 'choose-plan' | 'do-the-job' | 'end-the-sol' | 'read-summary';

export interface TutorialStep {
  id: TutorialStepId;
  /** Which step of five this is. */
  number: number;
  text: string;
}

export const TUTORIAL_STEPS = 5;

export function tutorialStep(save: SolSave | null, consoleOpen: boolean): TutorialStep | null {
  if (!save || save.tutorialDone || save.state.status !== 'active' || save.state.sol !== 1) return null;
  const { phase } = save.state;
  if (phase === 'decision') {
    return consoleOpen
      ? { id: 'choose-plan', number: 2, text: 'Pick one plan for today. Every plan gives you something and costs you something. Press a question mark to learn about any resource.' }
      : { id: 'walk-to-console', number: 1, text: 'Welcome to your first sol! A sol is one day on Mars. Each sol, you plan a job, do it, then end the day. Walk to the Command Console. It has an orange marker.' };
  }
  const job = urgentJob(save);
  if (job && !job.done) {
    return { id: 'do-the-job', number: 3, text: `Now do the urgent job at the ${findEquipment(job.card.urgent.equipment).name}. Look for the orange marker, or use the Map to travel there.` };
  }
  return { id: 'end-the-sol', number: 4, text: 'Well done! Go back to the Command Console and end the sol. Then you will see what happened in the night.' };
}

/** Shown on the first sol's summary, the last tutorial step. */
export const SUMMARY_STEP: TutorialStep = {
  id: 'read-summary',
  number: 5,
  text: 'This is your sol summary. It shows what your plan gave, what it cost, and what happened in the night. Every sol works like this. Good luck, astronaut!',
};
