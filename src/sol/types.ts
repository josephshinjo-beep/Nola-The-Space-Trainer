import type { Param, Resource } from './config';

/** An amount for some of the seven resources. Used for gains, costs and ledger records. */
export type Amounts = Partial<Record<Resource, number>>;

/** What a decision does to tonight's systems, in addition to its immediate effect. */
export type NightEffect = 'heatingLow' | 'greenhouseOff';

export interface Decision {
  id: string;
  title: string;
  summary: string;
  /** What the decision gives. Paid at once, or after the action phase if `gainsAfterAction` is set. */
  gains: Partial<Record<Resource, Param>>;
  /** What it costs straight away. The decision is refused if any of these cannot be paid. */
  costs: Partial<Record<Resource, Param>>;
  /** Costs that land tonight, during the night phase (for example a cold night). */
  deferredCosts?: Partial<Record<Resource, Param>>;
  nightEffect?: NightEffect;
  /** When set, the gains depend on a task completed in the 3D action phase. */
  gainsAfterAction?: { taskId: string; taskLabel: string };
  /** What it does for the crew's body (muscles and bones, rest). Paid with the gains. */
  bodyEffect?: Partial<Record<BodyPart, Param>>;
}

export type BodyPart = 'muscleBone' | 'rest';

export type Phase = 'decision' | 'action' | 'night';
export type MissionStatus = 'active' | 'complete' | 'failed';

export interface LedgerEntry {
  sol: number;
  phase: Phase;
  /** A decision id, or 'system:<reason>' for automatic effects such as life support. */
  source: string;
  label: string;
  /** What the entry added, as positive amounts. Always the amount actually applied. */
  gave: Amounts;
  /** What the entry took away, as positive amounts. Always the amount actually applied. */
  cost: Amounts;
  note?: string;
}

/** A task the 3D action phase must try, created by a decision. */
export interface PlannedTask {
  taskId: string;
  label: string;
  decisionId: string;
}

export interface SolState {
  sol: number;
  phase: Phase;
  status: MissionStatus;
  resources: Record<Resource, number>;
  /** Total radiation dose received by the crew so far, in mSv. */
  radiationDose: number;
  /** Decisions taken in the current sol, in order. */
  decisionsThisSol: string[];
  /** Tasks waiting for the action phase this sol. */
  plannedTasks: PlannedTask[];
  /** Night effects set by today's decisions. */
  tonight: { heatingLow: boolean; greenhouseOff: boolean; deferred: { decisionId: string; label: string; costs: Amounts }[] };
  ledger: LedgerEntry[];
  /** The crew's body: muscle and bone condition, and rest, each 0-100. */
  body: Record<BodyPart, number>;
  /** The radiation storm on its way, if any. */
  storm: RadiationStorm | null;
  /** Ids of real events already used for storms, so none repeats. */
  stormEventsUsed: string[];
}

/** What the 3D action phase reports back. */
export interface ActionReport {
  completed: string[];
  failed: string[];
  /** Crew health lost to accidents in the action phase. */
  crewHealthLost?: number;
}

/** Conditions outside the crew's control for one night (for example from NASA space-weather data). */
export interface NightConditions {
  /** Share of normal sunlight reaching the panels (1 = clear, 0.3 = dust storm). */
  sunlight: number;
  /** Multiplier on the surface radiation dose (1 = normal, 20 or more = solar particle event). */
  radiation: number;
}

export type StormChoice = 'reinforce' | 'shelter';

/** A radiation storm based on a real solar event from NASA DONKI. */
export interface RadiationStorm {
  event: { id: string; type: 'FLR' | 'CME' | 'SEP'; time: string; detail: string; link: string | null };
  /** True when the event came from live NASA data, false for the bundled archive. */
  live: boolean;
  severity: 1 | 2 | 3;
  announcedSol: number;
  /** The station-clock minute when the storm arrives (set by the game, for the countdown). */
  arrivesAtStationMinute: number;
  choice: StormChoice | null;
}

export type Result<T> = { ok: true; state: T } | { ok: false; reason: string };
