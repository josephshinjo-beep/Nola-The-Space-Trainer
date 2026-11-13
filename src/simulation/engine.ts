import type { StationStats } from '../features/academy/achievements';
import { SYSTEM_IDS, type SystemId } from '../features/unlocks/unlockManager';
import { SIM } from './config';
import { completedMissionCount, currentMission, isMissionComplete, MISSIONS } from './missions';
import type { Action, ActionResult, FaultId, LogTone, MachineId, StationState, StepInputs } from './types';

/**
 * The simulation engine: the rules that move the station forward in time
 * and respond to the player's actions.
 *
 * Every function takes a state and returns a NEW state without changing
 * the old one, and the same inputs always give the same result. That
 * makes the rules easy to test, save, and reason about.
 */

export const DEFAULT_INPUTS: StepInputs = {
  inShelter: false,
  spaceWeather: { stormChance: 1, stormIntensity: 1 },
};

const SYSTEM_NAMES: Record<SystemId, string> = {
  'station-access': 'Station access',
  oxygen: 'Oxygen Control',
  water: 'Water Recycling',
  food: 'The Hydroponics Lab',
  energy: 'The Power Bay',
  radiation: 'The Radiation Shelter',
  temperature: 'Thermal Control',
  communication: 'The Comms Room',
};

export const MACHINE_INFO: Record<MachineId, { name: string; system: SystemId }> = {
  oxygenGenerator: { name: 'Oxygen Generator', system: 'oxygen' },
  waterRecycler: { name: 'Water Recycler', system: 'water' },
  thermalControl: { name: 'Thermal Control', system: 'temperature' },
};

export const FAULT_INFO: Record<FaultId, { system: SystemId; alert: string; fixed: string }> = {
  'oxygen-generator': { system: 'oxygen', alert: 'The Oxygen Generator has stopped! Go to Oxygen Control to restart it.', fixed: 'Oxygen Generator restarted.' },
  'co2-filter': { system: 'oxygen', alert: 'The CO₂ filter is clogged and the air is getting stale. Replace it at the CO₂ Scrubber.', fixed: 'New CO₂ filter fitted. The air is clearing.' },
  'water-leak': { system: 'water', alert: 'A pipe is leaking in Water Recycling! Seal it at the Pipe Junction.', fixed: 'Leak sealed. No more wasted water.' },
  'panel-drift': { system: 'energy', alert: 'The solar panels have drifted away from the Sun. Realign them at Solar Control.', fixed: 'Panels realigned and facing the Sun.' },
  'thermal-fault': { system: 'temperature', alert: 'The thermostat is misreading. Recalibrate it at the Thermal Controller.', fixed: 'Thermostat recalibrated.' },
  antenna: { system: 'communication', alert: 'We have lost contact with Earth! Realign the antenna in the Comms Room.', fixed: 'Antenna realigned. Signal restored.' },
};

// ---------- small helpers ----------

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** A small, well-known random number generator (mulberry32). Returns [value 0..1, next state]. */
function random(rng: number): [number, number] {
  const next = (rng + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

function copy(state: StationState): StationState {
  return {
    ...state,
    resources: { ...state.resources },
    machines: { ...state.machines },
    crop: { ...state.crop },
    faults: [...state.faults],
    storm: state.storm ? { ...state.storm } : null,
    unlocked: [...state.unlocked],
    completedTasks: [...state.completedTasks],
    triggered: [...state.triggered],
    stats: { ...state.stats },
    log: [...state.log],
  };
}

function addLog(state: StationState, text: string, tone: LogTone): void {
  state.logSeq += 1;
  state.log = [...state.log, { id: state.logSeq, minutes: state.minutes, text, tone }].slice(-SIM.logLength);
}

function roll(state: StationState): number {
  const [value, next] = random(state.rng);
  state.rng = next;
  return value;
}

const has = (state: StationState, system: SystemId) => state.unlocked.includes(system);
const hasFault = (state: StationState, fault: FaultId) => state.faults.includes(fault);

/** True while the station is on the sunlit side of its orbit. */
export function isSunlit(minutes: number): boolean {
  return minutes % SIM.orbitMinutes < SIM.sunlitMinutes;
}

/** Whether each powered machine is actually doing its job right now. */
export function machineStatus(state: StationState) {
  const powered = !has(state, 'energy') || state.resources.energy > 0;
  const waterAvailable = !has(state, 'water') || state.resources.water > 0;
  return {
    powered,
    oxygenGenerator: state.machines.oxygenGenerator && powered && waterAvailable && !hasFault(state, 'oxygen-generator'),
    waterRecycler: state.machines.waterRecycler && powered,
    thermalControl: state.machines.thermalControl && powered && !hasFault(state, 'thermal-fault'),
    cropGrowing: state.crop.stage === 'growing' && powered && waterAvailable,
  };
}

/** Energy made and used per station hour right now (for the power display). */
export function energyFlow(state: StationState): { generation: number; consumption: number } {
  const running = machineStatus(state);
  const sunlight = state.panelsDeployed && isSunlit(state.minutes) ? 1 : 0;
  const generation = sunlight * SIM.solarEnergyPerHour * (hasFault(state, 'panel-drift') ? SIM.driftedPanelFactor : 1);
  const consumption =
    (state.powerSaver ? SIM.powerSaverEnergyPerHour : SIM.baseEnergyPerHour) +
    (running.oxygenGenerator ? SIM.generatorEnergyPerHour : 0) +
    (running.waterRecycler ? SIM.recyclerEnergyPerHour : 0) +
    (running.thermalControl ? SIM.thermalEnergyPerHour : 0) +
    (running.cropGrowing ? SIM.cropEnergyPerHour : 0);
  return { generation, consumption };
}

// ---------- creating and updating a game ----------

export function createInitialState(unlocked: readonly SystemId[], seed = 1): StationState {
  const state: StationState = {
    version: 1,
    rng: seed | 0,
    minutes: 0,
    status: 'running',
    resources: { oxygen: SIM.startLevel, water: SIM.startLevel, food: SIM.startLevel, energy: SIM.startLevel },
    temperature: SIM.comfortTemperature,
    radiation: SIM.backgroundRadiation,
    health: 100,
    unlocked: SYSTEM_IDS.filter((system) => unlocked.includes(system)),
    machines: { oxygenGenerator: false, waterRecycler: false, thermalControl: false },
    panelsDeployed: false,
    powerSaver: false,
    crop: { stage: 'empty', progress: 0 },
    faults: [],
    storm: null,
    nextEventAt: SIM.firstEventAfterMinutes,
    nextSupplyAt: SIM.supplyEveryMinutes,
    supplyRequestReadyAt: 0,
    healReadyAt: 0,
    completedTasks: [],
    triggered: [],
    stats: { stormsSheltered: 0, harvests: 0, repairs: 0 },
    log: [],
    logSeq: 0,
  };
  addLog(state, 'Welcome aboard! Check your mission list to get started.', 'info');
  return state;
}

/** Brings a saved game in line with what the student has now unlocked in the Academy. */
export function syncUnlocks(state: StationState, unlocked: readonly SystemId[]): StationState {
  const wanted = SYSTEM_IDS.filter((system) => unlocked.includes(system));
  if (wanted.length === state.unlocked.length && wanted.every((system) => state.unlocked.includes(system))) return state;
  const next = copy(state);
  for (const system of wanted) {
    if (!state.unlocked.includes(system) && system !== 'station-access') {
      addLog(next, `${SYSTEM_NAMES[system]} is now unlocked. It is yours to run!`, 'good');
    }
  }
  next.unlocked = wanted;
  // Faults and machines of systems that are no longer unlocked are cleared.
  next.faults = next.faults.filter((fault) => wanted.includes(FAULT_INFO[fault].system));
  if (!wanted.includes('radiation')) next.storm = null;
  return next;
}

/** Checks data loaded from the database before trusting it. Returns null if it is unusable. */
export function reviveState(raw: unknown): StationState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as Partial<StationState>;
  const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
  if (data.version !== 1 || !finite(data.minutes) || !finite(data.health) || !finite(data.rng)) return null;
  if (!data.resources || !(['oxygen', 'water', 'food', 'energy'] as const).every((id) => finite(data.resources?.[id]))) return null;
  if (!data.machines || !data.crop || !data.stats || !Array.isArray(data.unlocked) || !Array.isArray(data.completedTasks)) return null;
  if (!Array.isArray(data.faults) || !Array.isArray(data.log) || !Array.isArray(data.triggered)) return null;
  return copy(data as StationState);
}

export function getStationStats(state: StationState): StationStats {
  return {
    missionsCompleted: completedMissionCount(state),
    daysSurvived: Math.floor(state.minutes / (24 * 60)),
    stormsSheltered: state.stats.stormsSheltered,
    harvests: state.stats.harvests,
    repairs: state.stats.repairs,
  };
}

// ---------- missions ----------

const ALL_TASK_IDS = new Set(MISSIONS.flatMap((mission) => mission.tasks.map((task) => task.id)));

function completeTask(state: StationState, taskId: string): void {
  if (!ALL_TASK_IDS.has(taskId) || state.completedTasks.includes(taskId)) return;
  const mission = MISSIONS.find((candidate) => candidate.tasks.some((task) => task.id === taskId));
  if (!mission || !has(state, mission.system)) return;
  state.completedTasks.push(taskId);
  if (isMissionComplete(mission, state)) addLog(state, `Mission complete: ${mission.title}! Brilliant work.`, 'good');
}

function startStorm(state: StationState, intensity: number, durationMinutes: number): void {
  state.storm = { endsAt: state.minutes + durationMinutes, intensity, minutesExposed: 0, minutesTotal: 0 };
  addLog(state, 'Solar storm! Radiation is rising. Get to the Radiation Shelter and stay there until it passes.', 'danger');
}

/** Sets up whatever the current mission task needs (a fault to fix, a storm to shelter from). */
function prepareMission(state: StationState): void {
  const mission = currentMission(state);
  if (!mission) return;
  const task = mission.tasks.find((candidate) => !state.completedTasks.includes(candidate.id));
  if (!task || state.triggered.includes(task.id)) return;
  if (task.needsFault && !hasFault(state, task.needsFault)) {
    state.triggered.push(task.id);
    state.faults.push(task.needsFault);
    addLog(state, FAULT_INFO[task.needsFault].alert, 'warn');
  } else if (task.needsStorm && !state.storm) {
    state.triggered.push(task.id);
    startStorm(state, 1, SIM.stormMinMinutes);
  }
}

// ---------- moving time forward ----------

function triggerRandomEvent(state: StationState, inputs: StepInputs): void {
  const options: (FaultId | 'storm')[] = [];
  const add = (fault: FaultId, allowed: boolean) => {
    if (allowed && has(state, FAULT_INFO[fault].system) && !hasFault(state, fault)) options.push(fault);
  };
  if (state.faults.length < SIM.maxFaultsAtOnce) {
    add('oxygen-generator', state.machines.oxygenGenerator);
    add('co2-filter', true);
    add('water-leak', true);
    add('panel-drift', state.panelsDeployed);
    add('thermal-fault', state.machines.thermalControl);
    add('antenna', true);
  }
  if (has(state, 'radiation') && !state.storm) {
    // Active space weather makes storms more likely to be picked.
    const tickets = Math.round(clamp(inputs.spaceWeather.stormChance, 0, 4) * 2);
    for (let i = 0; i < tickets; i++) options.push('storm');
  }
  const choice = options[Math.floor(roll(state) * options.length)];
  if (choice === 'storm') {
    const duration = SIM.stormMinMinutes + roll(state) * (SIM.stormMaxMinutes - SIM.stormMinMinutes);
    startStorm(state, clamp(Math.round(inputs.spaceWeather.stormIntensity), 1, 3), duration);
  } else if (choice) {
    state.faults.push(choice);
    addLog(state, FAULT_INFO[choice].alert, 'warn');
  }
}

/** Moves one small slice of time (a few station minutes) forward. Changes `state` in place. */
function advance(state: StationState, minutes: number, inputs: StepInputs): void {
  const hours = minutes / 60;
  state.minutes += minutes;
  const running = machineStatus(state);
  const sunlit = isSunlit(state.minutes);
  const r = state.resources;

  // Energy: solar panels in, machines out.
  if (has(state, 'energy')) {
    const flow = energyFlow(state);
    r.energy += (flow.generation - flow.consumption) * hours;
  }

  // Oxygen: the crew breathes it; the generator makes it; a clogged filter spoils it.
  if (has(state, 'oxygen')) {
    r.oxygen -= SIM.crewOxygenPerHour * hours;
    if (running.oxygenGenerator) r.oxygen += SIM.generatorOxygenPerHour * hours;
    if (hasFault(state, 'co2-filter')) r.oxygen -= SIM.cloggedFilterOxygenPerHour * hours;
  }

  // Water: the crew uses it; the recycler wins most of it back.
  if (has(state, 'water')) {
    r.water -= SIM.crewWaterPerHour * (running.waterRecycler ? 1 - SIM.recyclerRecovery : 1) * hours;
    if (hasFault(state, 'water-leak')) r.water -= SIM.leakWaterPerHour * hours;
    if (running.oxygenGenerator) r.water -= SIM.generatorWaterPerHour * hours;
    if (running.cropGrowing) r.water -= SIM.cropWaterPerHour * hours;
  }

  // Food: the crew eats; crops grow slowly.
  if (has(state, 'food')) {
    r.food -= SIM.crewFoodPerHour * hours;
    if (running.cropGrowing) {
      state.crop.progress = Math.min(1, state.crop.progress + hours / SIM.cropGrowHours);
      if (state.crop.progress >= 1) {
        state.crop.stage = 'ready';
        addLog(state, 'Your crop is ready to harvest in the Hydroponics Lab!', 'good');
      }
    }
  }

  // Temperature: drifts hot in sunlight and cold in shadow unless thermal control holds it.
  if (has(state, 'temperature')) {
    const target = running.thermalControl ? SIM.comfortTemperature : sunlit ? SIM.sunlitDriftTarget : SIM.shadowDriftTarget;
    const rate = (running.thermalControl ? SIM.controlDegreesPerHour : SIM.driftDegreesPerHour) * hours;
    const gap = target - state.temperature;
    state.temperature += Math.sign(gap) * Math.min(Math.abs(gap), rate);
  }

  // Radiation: storms raise it; the shelter blocks most of it.
  if (state.storm) {
    const outside = state.storm.intensity * SIM.stormRadiationPerIntensity;
    state.radiation = inputs.inShelter ? outside * SIM.shelterFactor : outside;
    state.storm.minutesTotal += minutes;
    if (inputs.inShelter) completeTask(state, 'shelter');
    else state.storm.minutesExposed += minutes;
    if (state.minutes >= state.storm.endsAt) {
      const sheltered = state.storm.minutesExposed <= state.storm.minutesTotal * 0.4;
      if (sheltered) state.stats.stormsSheltered += 1;
      addLog(state, sheltered ? 'The solar storm has passed. Well sheltered!' : 'The solar storm has passed. Next time, reach the shelter sooner.', sheltered ? 'good' : 'info');
      state.storm = null;
      state.radiation = SIM.backgroundRadiation;
    }
  } else {
    state.radiation = SIM.backgroundRadiation;
  }

  // Locked systems are on autopilot: NOLA holds them steady.
  for (const id of ['oxygen', 'water', 'food', 'energy'] as const) {
    const system: SystemId = id;
    r[id] = has(state, system) ? clamp(r[id], 0, 100) : SIM.autopilotLevel;
  }
  if (!has(state, 'temperature')) state.temperature = SIM.comfortTemperature;

  // Crew condition.
  let damage = 0;
  if (r.oxygen < SIM.lowOxygenLevel) damage += SIM.lowOxygenDamagePerHour;
  if (r.water <= 0) damage += SIM.noWaterDamagePerHour;
  if (r.food <= 0) damage += SIM.noFoodDamagePerHour;
  if (state.temperature < SIM.tooCold || state.temperature > SIM.tooHot) damage += SIM.badTemperatureDamagePerHour;
  if (state.radiation > SIM.radiationHarmLevel) damage += state.radiation * SIM.radiationDamagePerLevelHour;
  state.health = clamp(state.health + (damage > 0 ? -damage : SIM.healthRecoveryPerHour) * hours, 0, 100);
  if (state.health <= 0) {
    state.status = 'failed';
    addLog(state, 'The crew is too unwell to continue. NOLA has started the emergency recovery.', 'danger');
    return;
  }

  // Cargo ship.
  if (state.minutes >= state.nextSupplyAt) {
    state.nextSupplyAt += SIM.supplyEveryMinutes;
    if (has(state, 'water')) r.water = clamp(r.water + SIM.supplyWater, 0, 100);
    if (has(state, 'food')) r.food = clamp(r.food + SIM.supplyFood, 0, 100);
    if (has(state, 'water') || has(state, 'food')) addLog(state, 'A cargo ship has docked with fresh water and food.', 'good');
  }

  // Random problems.
  if (state.minutes >= state.nextEventAt) {
    state.nextEventAt = state.minutes + SIM.eventMinGapMinutes + roll(state) * (SIM.eventMaxGapMinutes - SIM.eventMinGapMinutes);
    triggerRandomEvent(state, inputs);
  }

  prepareMission(state);
}

/** Moves the station forward by a number of station minutes. */
export function step(state: StationState, minutes: number, inputs: StepInputs = DEFAULT_INPUTS): StationState {
  if (state.status !== 'running' || minutes <= 0) return state;
  const next = copy(state);
  let remaining = minutes;
  while (remaining > 0 && next.status === 'running') {
    const slice = Math.min(5, remaining);
    advance(next, slice, inputs);
    remaining -= slice;
  }
  return next;
}

// ---------- player actions ----------

function locked(system: SystemId): string {
  return `${SYSTEM_NAMES[system]} is locked. Pass its Academy module to use it.`;
}

/** Applies one player action and says what happened, in words NOLA can show. */
export function applyAction(state: StationState, action: Action): ActionResult {
  if (state.status !== 'running') return { state, ok: false, message: 'The station is in emergency recovery.' };
  const next = copy(state);
  const done = (message: string, tone: LogTone = 'info'): ActionResult => {
    if (tone !== 'info') addLog(next, message, tone);
    prepareMission(next);
    return { state: next, ok: true, message };
  };
  const refuse = (message: string): ActionResult => ({ state, ok: false, message });

  switch (action.type) {
    case 'visit':
      completeTask(next, `visit:${action.room}`);
      return done('');

    case 'useConsole':
      completeTask(next, 'use-console');
      return done('Checked in at the Command Console.');

    case 'toggleMachine': {
      const info = MACHINE_INFO[action.machine];
      if (!has(next, info.system)) return refuse(locked(info.system));
      const on = !next.machines[action.machine];
      next.machines[action.machine] = on;
      if (on) completeTask(next, `start:${action.machine}`);
      return done(`${info.name} switched ${on ? 'on' : 'off'}.`, on ? 'good' : 'info');
    }

    case 'deployPanels':
      if (!has(next, 'energy')) return refuse(locked('energy'));
      if (next.panelsDeployed) return refuse('The solar panels are already deployed.');
      next.panelsDeployed = true;
      completeTask(next, 'deploy-panels');
      return done('Solar panels deployed! They make power whenever the station is in sunlight.', 'good');

    case 'togglePowerSaver':
      if (!has(next, 'energy')) return refuse(locked('energy'));
      next.powerSaver = !next.powerSaver;
      return done(`Power saver ${next.powerSaver ? 'on: lights dimmed to save energy' : 'off'}.`);

    case 'plant':
      if (!has(next, 'food')) return refuse(locked('food'));
      if (next.crop.stage !== 'empty') return refuse('The grow bed is already in use.');
      next.crop = { stage: 'growing', progress: 0 };
      completeTask(next, 'plant');
      return done('Seeds planted! Crops need water, power and time to grow.', 'good');

    case 'harvest':
      if (!has(next, 'food')) return refuse(locked('food'));
      if (next.crop.stage !== 'ready') return refuse('The crop is not ready yet.');
      next.crop = { stage: 'empty', progress: 0 };
      next.resources.food = clamp(next.resources.food + SIM.harvestFood, 0, 100);
      next.stats.harvests += 1;
      completeTask(next, 'harvest');
      return done('Harvest time! Fresh food added to the store. Plant again to keep it coming.', 'good');

    case 'repair': {
      if (!hasFault(next, action.fault)) return refuse('Nothing needs fixing here right now.');
      next.faults = next.faults.filter((fault) => fault !== action.fault);
      next.stats.repairs += 1;
      completeTask(next, `repair:${action.fault}`);
      return done(FAULT_INFO[action.fault].fixed, 'good');
    }

    case 'heal':
      if (next.minutes < next.healReadyAt) return refuse('The Med Station is recharging. Try again a little later.');
      next.health = clamp(next.health + SIM.healAmount, 0, 100);
      next.healReadyAt = next.minutes + SIM.healCooldownMinutes;
      completeTask(next, 'heal');
      return done('Check-up complete. The crew is feeling better.', 'good');

    case 'checkMonitor':
      if (!has(next, 'radiation')) return refuse(locked('radiation'));
      completeTask(next, 'check-monitor');
      return done(next.storm ? 'Radiation is HIGH. Stay in the shelter!' : 'Radiation is at its normal background level.');

    case 'requestSupply':
      if (!has(next, 'communication')) return refuse(locked('communication'));
      if (hasFault(next, 'antenna')) return refuse('No signal! Realign the antenna first.');
      if (next.minutes < next.supplyRequestReadyAt) return refuse('Earth is still preparing the last request. Try again later.');
      next.supplyRequestReadyAt = next.minutes + SIM.supplyRequestCooldownMinutes;
      next.nextSupplyAt = Math.min(next.nextSupplyAt, next.minutes + 120);
      completeTask(next, 'request-supply');
      return done('Message sent! Earth says a cargo ship will arrive in about two hours.', 'good');
  }
}

/** After a failure: NOLA stabilises the station so the student can try again without losing progress. */
export function recover(state: StationState): StationState {
  const next = copy(state);
  next.status = 'running';
  next.health = 60;
  for (const id of ['oxygen', 'water', 'food', 'energy'] as const) next.resources[id] = Math.max(next.resources[id], 50);
  next.temperature = SIM.comfortTemperature;
  next.faults = [];
  next.storm = null;
  next.radiation = SIM.backgroundRadiation;
  next.nextEventAt = next.minutes + SIM.firstEventAfterMinutes;
  addLog(next, 'Emergency recovery complete. The station is stable. You can do this!', 'info');
  return next;
}
