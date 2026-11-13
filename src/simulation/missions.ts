import type { SystemId } from '../features/unlocks/unlockManager';
import type { FaultId, StationState } from './types';

/**
 * The station missions. Each belongs to one station system, so it opens
 * when the matching Academy module is passed. A task is ticked off when
 * the engine sees the matching action happen (see `taskFor` in engine.ts).
 */

export interface MissionTask {
  /** Matches an action trigger, e.g. "start:oxygenGenerator". */
  id: string;
  label: string;
  /** Where to go, shown as a hint. */
  hint: string;
  /** The mission creates this fault so there is something to repair. */
  needsFault?: FaultId;
  /** The mission starts a (mild) solar storm for this task. */
  needsStorm?: boolean;
}

export interface Mission {
  id: string;
  title: string;
  system: SystemId;
  briefing: string;
  tasks: MissionTask[];
}

export const MISSIONS: Mission[] = [
  {
    id: 'find-your-feet',
    title: 'Find Your Feet',
    system: 'station-access',
    briefing: 'Welcome aboard! Get to know your station.',
    tasks: [
      { id: 'use-console', label: 'Check in at the Command Console', hint: 'In the main corridor' },
      { id: 'visit:medical', label: 'Find the Medical Bay', hint: 'Bottom row, second room' },
      { id: 'heal', label: 'Have a check-up at the Med Station', hint: 'Medical Bay' },
    ],
  },
  {
    id: 'breathe-easy',
    title: 'Breathe Easy',
    system: 'oxygen',
    briefing: 'The crew needs fresh air. Get the oxygen system running.',
    tasks: [
      { id: 'start:oxygenGenerator', label: 'Switch on the Oxygen Generator', hint: 'Oxygen Control' },
      { id: 'repair:co2-filter', label: 'Replace the clogged CO₂ filter', hint: 'CO₂ Scrubber in Oxygen Control', needsFault: 'co2-filter' },
    ],
  },
  {
    id: 'every-drop-counts',
    title: 'Every Drop Counts',
    system: 'water',
    briefing: 'Water is precious. Start recycling and stop any leaks.',
    tasks: [
      { id: 'start:waterRecycler', label: 'Switch on the Water Recycler', hint: 'Water Recycling' },
      { id: 'repair:water-leak', label: 'Seal the leaking pipe', hint: 'Pipe Junction in Water Recycling', needsFault: 'water-leak' },
    ],
  },
  {
    id: 'space-farmer',
    title: 'Space Farmer',
    system: 'food',
    briefing: 'Time to grow your own food.',
    tasks: [
      { id: 'plant', label: 'Plant a crop in the Grow Bed', hint: 'Hydroponics Lab' },
      { id: 'harvest', label: 'Harvest the crop when it is ready', hint: 'Hydroponics Lab (crops take time!)' },
    ],
  },
  {
    id: 'power-up',
    title: 'Power Up',
    system: 'energy',
    briefing: 'You are in charge of the power now. Catch some sunlight!',
    tasks: [
      { id: 'deploy-panels', label: 'Deploy the solar panels', hint: 'Solar Control in the Power Bay' },
      { id: 'repair:panel-drift', label: 'Realign the drifting panels', hint: 'Solar Control in the Power Bay', needsFault: 'panel-drift' },
    ],
  },
  {
    id: 'storm-warning',
    title: 'Storm Warning',
    system: 'radiation',
    briefing: 'A solar storm is on its way. Do you know what to do?',
    tasks: [
      { id: 'check-monitor', label: 'Read the Radiation Monitor', hint: 'Radiation Shelter' },
      { id: 'shelter', label: 'Take shelter during a solar storm', hint: 'Stay inside the Radiation Shelter', needsStorm: true },
    ],
  },
  {
    id: 'just-right',
    title: 'Just Right',
    system: 'temperature',
    briefing: 'Sunlight and shadow are pushing the temperature around.',
    tasks: [
      { id: 'start:thermalControl', label: 'Switch on Thermal Control', hint: 'Thermal Control room' },
      { id: 'repair:thermal-fault', label: 'Recalibrate the thermostat', hint: 'Thermal Controller', needsFault: 'thermal-fault' },
    ],
  },
  {
    id: 'calling-earth',
    title: 'Calling Earth',
    system: 'communication',
    briefing: 'Mission control is waiting to hear from you.',
    tasks: [
      { id: 'repair:antenna', label: 'Realign the antenna', hint: 'Antenna Console in the Comms Room', needsFault: 'antenna' },
      { id: 'request-supply', label: 'Request a supply delivery from Earth', hint: 'Antenna Console in the Comms Room' },
    ],
  },
];

export function isMissionComplete(mission: Mission, state: Pick<StationState, 'completedTasks'>): boolean {
  return mission.tasks.every((task) => state.completedTasks.includes(task.id));
}

/** The first unfinished mission whose system is unlocked, or null when all are done. */
export function currentMission(state: Pick<StationState, 'completedTasks' | 'unlocked'>): Mission | null {
  return MISSIONS.find((mission) => state.unlocked.includes(mission.system) && !isMissionComplete(mission, state)) ?? null;
}

export function completedMissionCount(state: Pick<StationState, 'completedTasks' | 'unlocked'>): number {
  return MISSIONS.filter((mission) => state.unlocked.includes(mission.system) && isMissionComplete(mission, state)).length;
}
