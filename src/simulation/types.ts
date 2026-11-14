import type { SystemId } from '../features/unlocks/unlockManager';

/**
 * The complete state of the station simulation.
 *
 * It is plain data (numbers, strings, lists), so it can be saved to the
 * database as-is and restored later. Nothing here knows about Phaser or
 * React: the game only displays this state and sends actions to change it.
 */

export type ResourceId = 'oxygen' | 'water' | 'food' | 'energy';

export type RoomId = 'corridor' | 'oxygen' | 'hydroponics' | 'power' | 'comms' | 'water' | 'medical' | 'thermal' | 'shelter';

/** Machines the player switches on and off. */
export type MachineId = 'oxygenGenerator' | 'waterRecycler' | 'thermalControl';

/** Things that can break and need a repair. */
export type FaultId = 'oxygen-generator' | 'co2-filter' | 'water-leak' | 'panel-drift' | 'thermal-fault' | 'antenna';

/** Where the base is. It sets how long radio messages take to and from Earth. */
export type SiteId = 'moon' | 'mars';

/** A question sent to Mission Control about a problem, waiting for (or with) a reply. */
export interface EarthCall {
  fault: FaultId;
  site: SiteId;
  /** Real one-way signal time in seconds, for display. Never scaled. */
  oneWaySeconds: number;
  /** Station minute the message was sent, and the minute the reply arrives. */
  sentAt: number;
  repliesAt: number;
  replied: boolean;
  /** Resources when the message was sent, to show what was lost while waiting. */
  resourcesAtSend: Record<ResourceId, number>;
}

export type LogTone = 'info' | 'good' | 'warn' | 'danger';

export interface LogEntry {
  id: number;
  /** Station time of the entry, in minutes. */
  minutes: number;
  text: string;
  tone: LogTone;
}

export interface StationState {
  version: 1;
  /** Internal random-number state. Stored so a saved game continues the same way. */
  rng: number;
  /** Station time since the start, in minutes. */
  minutes: number;
  status: 'running' | 'failed';

  /** Each resource runs from 0 (empty) to 100 (full). */
  resources: Record<ResourceId, number>;
  /** Cabin temperature in °C. */
  temperature: number;
  /** Radiation level where the crew is right now, 0 to 100. A game variable, not a real unit. */
  radiation: number;
  /** Crew condition, 0 to 100. */
  health: number;

  /** Systems earned in the Academy. Locked systems are looked after automatically. */
  unlocked: SystemId[];
  machines: Record<MachineId, boolean>;
  panelsDeployed: boolean;
  powerSaver: boolean;
  crop: { stage: 'empty' | 'growing' | 'ready'; progress: number };
  faults: FaultId[];
  storm: { endsAt: number; intensity: number; minutesExposed: number; minutesTotal: number } | null;

  nextEventAt: number;
  nextSupplyAt: number;
  supplyRequestReadyAt: number;
  healReadyAt: number;

  completedTasks: string[];
  /** Mission faults and storms already started, so each is triggered once. */
  triggered: string[];
  stats: { stormsSheltered: number; harvests: number; repairs: number; askedEarthFixes?: number; trainingFixes?: number };
  /** The base's site, chosen by the player (null until chosen). */
  site: SiteId | null;
  /** Questions to Mission Control, at most one per problem. */
  earthCalls: EarthCall[];
  log: LogEntry[];
  logSeq: number;
}

/** Things outside the engine's control that it is told about every step. */
export interface StepInputs {
  /** True while the astronaut is standing in the Radiation Shelter. */
  inShelter: boolean;
  /** Derived from space-weather data (mock or NASA). See src/data. */
  spaceWeather: {
    /** Multiplier on how often solar storms start (1 = normal). */
    stormChance: number;
    /** Strength of storms that start now: 1 (minor) to 3 (severe). */
    stormIntensity: number;
  };
}

/** Everything the player can do to the station. */
export type Action =
  | { type: 'visit'; room: RoomId }
  | { type: 'useConsole' }
  | { type: 'toggleMachine'; machine: MachineId }
  | { type: 'deployPanels' }
  | { type: 'togglePowerSaver' }
  | { type: 'plant' }
  | { type: 'harvest' }
  | { type: 'repair'; fault: FaultId }
  | { type: 'heal' }
  | { type: 'checkMonitor' }
  | { type: 'requestSupply' }
  | { type: 'chooseSite'; site: SiteId }
  /** Ask Mission Control how to fix a problem. The real delay comes from the game (it depends on the date for Mars). */
  | { type: 'askEarth'; fault: FaultId; oneWaySeconds: number }
  /** The player acted on their own training and chose the wrong step. */
  | { type: 'trainingMistake'; fault: FaultId };

export interface ActionResult {
  state: StationState;
  ok: boolean;
  message: string;
}
