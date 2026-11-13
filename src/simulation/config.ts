/**
 * Every number that shapes the simulation lives here, so the game can be
 * re-balanced without touching the logic.
 *
 * HONESTY NOTE: these are simplified GAME values chosen to be fun and
 * understandable. They copy how the real systems depend on each other
 * (oxygen needs water and power, recycling saves water, panels only work
 * in sunlight) but they are NOT real engineering figures. Resources are
 * shown as 0–100% of a tank, not in real units.
 */
export const SIM = {
  /** Station minutes that pass for each real second of play. */
  minutesPerRealSecond: 2,

  /** One trip around the planet, and how much of it is in sunlight (the real ISS: about 92 and 57 minutes). */
  orbitMinutes: 90,
  sunlitMinutes: 57,

  startLevel: 80,
  /** Level a locked system is held at while NOLA looks after it. */
  autopilotLevel: 80,
  comfortTemperature: 22,

  // Crew needs, in % of a full tank per station hour.
  crewOxygenPerHour: 1.2,
  crewWaterPerHour: 1.0,
  crewFoodPerHour: 0.7,

  // Oxygen generator (electrolysis: uses water and electricity).
  generatorOxygenPerHour: 2.4,
  generatorWaterPerHour: 0.15,
  generatorEnergyPerHour: 1.5,
  cloggedFilterOxygenPerHour: 1.2,

  // Water recycler.
  recyclerRecovery: 0.9,
  recyclerEnergyPerHour: 1.0,
  leakWaterPerHour: 2.5,

  // Hydroponics.
  cropGrowHours: 14,
  cropWaterPerHour: 0.2,
  cropEnergyPerHour: 0.8,
  harvestFood: 30,

  // Power.
  solarEnergyPerHour: 11,
  driftedPanelFactor: 0.35,
  baseEnergyPerHour: 1.0,
  powerSaverEnergyPerHour: 0.5,

  // Temperature, in °C.
  thermalEnergyPerHour: 1.2,
  sunlitDriftTarget: 36,
  shadowDriftTarget: 2,
  driftDegreesPerHour: 1.6,
  controlDegreesPerHour: 8,
  tooCold: 10,
  tooHot: 32,

  // Radiation (game variable).
  backgroundRadiation: 4,
  stormRadiationPerIntensity: 30,
  shelterFactor: 0.1,
  stormMinMinutes: 150,
  stormMaxMinutes: 270,

  // Crew condition, in points per station hour.
  healthRecoveryPerHour: 1.5,
  lowOxygenLevel: 20,
  lowOxygenDamagePerHour: 7,
  noWaterDamagePerHour: 4,
  noFoodDamagePerHour: 2,
  badTemperatureDamagePerHour: 3,
  radiationDamagePerLevelHour: 0.1,
  radiationHarmLevel: 15,
  healAmount: 35,
  healCooldownMinutes: 240,

  // Random problems.
  firstEventAfterMinutes: 180,
  eventMinGapMinutes: 300,
  eventMaxGapMinutes: 540,
  maxFaultsAtOnce: 2,

  // Cargo deliveries.
  supplyEveryMinutes: 72 * 60,
  supplyWater: 25,
  supplyFood: 25,
  supplyRequestCooldownMinutes: 36 * 60,

  logLength: 12,
} as const;
