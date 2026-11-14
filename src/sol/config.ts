/**
 * Every number used by the sol engine, in one place.
 *
 * Each value records its BASIS:
 *   NASA_BASED  a real figure from a NASA source or from established science,
 *               named in the note. Rounded for the game, but not invented.
 *   SIMPLIFIED  a game value chosen for balance and clarity. It may be inspired
 *               by real systems, but it is not a measured or engineering figure.
 *
 * The engine reads nothing that is not in this file, and the unit tests check
 * that every value has a basis and a note.
 */

export type Basis = 'NASA_BASED' | 'SIMPLIFIED';

export interface Param {
  value: number;
  unit: string;
  basis: Basis;
  note: string;
}

const nasa = (value: number, unit: string, note: string): Param => ({ value, unit, basis: 'NASA_BASED', note });
const simple = (value: number, unit: string, note: string): Param => ({ value, unit, basis: 'SIMPLIFIED', note });

/** The seven tracked resources. */
export const RESOURCES = ['oxygen', 'water', 'food', 'power', 'shielding', 'crewHealth', 'research'] as const;
export type Resource = (typeof RESOURCES)[number];

export const SOL_CONFIG = {
  time: {
    // NASA_BASED: one Mars solar day is 24 h 39 min 35 s (NASA Mars Fact Sheet).
    solLengthSeconds: nasa(88_775, 's', 'One Mars solar day (sol) is 24 h 39 min 35 s. Source: NASA Mars Fact Sheet.'),
    // SIMPLIFIED: real surface stays in NASA's Mars reference mission are about 500 sols.
    missionLengthSols: simple(30, 'sols', 'A short game mission. NASA Mars Design Reference Architecture 5.0 plans about 500 sols on the surface.'),
    // SIMPLIFIED
    decisionsPerSol: simple(2, 'decisions', 'How many decisions the crew can make in each decision phase.'),
  },

  crew: {
    // SIMPLIFIED: NASA DRA 5.0 assumes a crew of six.
    size: simple(4, 'people', 'Crew size kept small for the game. NASA Mars Design Reference Architecture 5.0 assumes six.'),
    // NASA_BASED
    oxygenPerPersonPerSol: nasa(0.84, 'kg', 'Oxygen breathed per person per day. Source: NASA Baseline Values and Assumptions Document (BVAD), NASA/TP-2015-218570.'),
    // NASA_BASED
    waterPerPersonPerSol: nasa(2.5, 'kg', 'Drinking water plus water added to food, per person per day (about 2.5 kg). Source: NASA BVAD, NASA/TP-2015-218570.'),
    // NASA_BASED
    foodPerPersonPerSol: nasa(1.8, 'kg', 'Packaged food mass per person per day, including packaging. Source: NASA BVAD, NASA/TP-2015-218570.'),
  },

  start: {
    oxygen: simple(60, 'kg', 'Oxygen held in reserve tanks at the start.'),
    water: simple(400, 'kg', 'Water in storage at the start.'),
    food: simple(200, 'kg', 'Food stored at the start: about 28 sols for four people without the greenhouse.'),
    power: simple(100, 'kWh', 'Energy stored in the batteries at the start.'),
    shielding: simple(70, '%', 'Radiation shielding integrity at the start (a game percentage, not a physical unit).'),
    crewHealth: simple(90, '%', 'Overall crew condition at the start (a game percentage).'),
    research: simple(10, 'points', 'Research points at the start: results already gathered on the journey, so the crew has research time it can give up to shelter from a radiation storm.'),
  },

  capacity: {
    oxygen: simple(80, 'kg', 'Size of the oxygen reserve tanks.'),
    water: simple(500, 'kg', 'Size of the water store.'),
    food: simple(300, 'kg', 'Size of the food store.'),
    power: simple(120, 'kWh', 'Battery capacity.'),
    shielding: simple(100, '%', 'Fully intact shielding.'),
    crewHealth: simple(100, '%', 'A fully healthy crew.'),
    research: simple(1000, 'points', 'Upper limit, never reached in normal play.'),
  },

  /** A resource below this share of its capacity counts as low: the crew stops recovering. */
  warningShare: simple(0.25, 'share', 'Low-resource warning at 25% of capacity, a common survival-game threshold.'),

  power: {
    // SIMPLIFIED: Mars gets about 43% of Earth's sunlight (NASA), but this output is a game value.
    solarPerSol: simple(72, 'kWh', 'Solar energy collected on a clear sol: a little more than the night load of 67 kWh, so the batteries slowly refill. Game value. Real fact for context: sunlight at Mars is about 43% as strong as at Earth (NASA Mars Fact Sheet).'),
    lifeSupportLoad: simple(25, 'kWh', 'Fans, carbon dioxide scrubbers, water recycler and computers. Always runs.'),
    oxygenGeneratorLoad: simple(10, 'kWh', 'Energy for the oxygen generator to make one sol of oxygen.'),
    heatingNormalLoad: simple(20, 'kWh', 'Night heating at normal comfort.'),
    heatingLowLoad: simple(8, 'kWh', 'Night heating turned down: the habitat gets cold.'),
    greenhouseLoad: simple(12, 'kWh', 'Grow lights and heaters for the greenhouse overnight.'),
  },

  lifeSupport: {
    // SIMPLIFIED: the ISS recovers about 98% (NASA, 2023); the game uses less to keep water meaningful.
    waterRecoveryShare: simple(0.9, 'share', 'Share of used water the recycler wins back. Real fact for context: the ISS reached 98% in 2023 (NASA).'),
    oxygenGeneratorWaterLoss: simple(0.4, 'kg', 'Net water lost each sol by making oxygen, after recovery. Game value.'),
  },

  greenhouse: {
    yieldPerSol: simple(2, 'kg', 'Food grown per sol when the greenhouse runs overnight. Game value.'),
  },

  shielding: {
    wearPerSol: simple(1, '%', 'Shielding integrity lost each sol to dust, wear and small impacts. Game value.'),
    maxDoseReduction: simple(0.6, 'share', 'At 100% integrity the habitat blocks 60% of the surface dose. Game value.'),
  },

  radiation: {
    // NASA_BASED
    surfaceDosePerSol: nasa(0.67, 'mSv', 'Average radiation dose on the Mars surface measured by Curiosity\'s RAD instrument: about 0.64-0.67 mSv per sol (Hassler et al., Science, 2014).'),
    // NASA_BASED
    careerLimit: nasa(600, 'mSv', 'NASA\'s career limit for astronaut radiation exposure. Source: NASA-STD-3001 (2022 update).'),
    safeDosePerSol: simple(1, 'mSv', 'Above this dose in one sol, the crew\'s health drops. Game value.'),
    healthLossPerMsvOverSafe: simple(0.5, '%', 'Crew health lost per mSv above the safe dose in a sol. Game value.'),
  },

  health: {
    recoveryPerSol: simple(2, '%', 'Crew health regained on a good sol: warm night, no shortages, nothing low.'),
    coldNightLoss: simple(5, '%', 'Crew health lost after a night with the heating turned down.'),
    oxygenShortLoss: simple(15, '%', 'Crew health lost in a sol when oxygen runs out.'),
    waterShortLoss: simple(10, '%', 'Crew health lost in a sol when water runs out.'),
    foodShortLoss: simple(5, '%', 'Crew health lost in a sol when food runs out.'),
    brownoutLoss: simple(10, '%', 'Crew health lost when even basic life support runs short of power.'),
  },

  action: {
    maxCrewHealthLoss: simple(10, '%', 'The most crew health the action phase can report losing in one sol.'),
    failedTaskGainShare: simple(0, 'share', 'Share of a task\'s reward still earned when the action-phase task fails.'),
  },

  goal: {
    researchTarget: simple(40, 'points', 'Research needed for the mission to count as a scientific success.'),
  },

  /**
   * Radiation storms based on real solar events from NASA DONKI. The event
   * is real; everything the game does with it is a game mechanic, not a
   * radiation forecast. Amounts are multiplied by the storm's severity (1-3).
   */
  storm: {
    everySols: simple(3, 'sols', 'A radiation storm warning comes every third sol, once the Radiation Protection module is passed.'),
    warningStationMinutes: simple(240, 'station minutes', 'Time between the warning and the storm arriving: 4 station hours, about 2 real minutes of play.'),
    reinforcePowerPerSeverity: simple(8, 'kWh', 'Power to strengthen the shield before the storm, per level of severity.'),
    reinforceWaterPerSeverity: simple(10, 'kg', 'Water pumped into the shield walls, per level of severity. Real fact for context: water is a good radiation shield, and NASA studies water walls for spacecraft.'),
    shelterResearchPerSeverity: simple(3, 'points', 'Research time lost while the crew waits in the shelter, per level of severity.'),
    harmUnprotectedPerSeverity: simple(8, '%', 'Crew health lost to the storm if the crew does nothing, per level of severity.'),
    harmReinforcedPerSeverity: simple(2, '%', 'Crew health lost to the storm behind a reinforced shield, per level of severity.'),
    harmShelteredPerSeverity: simple(0, '%', 'Crew health lost to the storm inside the shelter. Real fact for context: astronauts on the ISS shelter in its best-shielded modules during solar storms.'),
  },
} as const;

/** Every amount a decision can give or take. Kept here so all numbers live in one file. */
export const DECISION_AMOUNTS = {
  extraResearchTask: {
    oxygenCost: simple(2, 'kg', 'Oxygen used from the reserve for an extra lab or field task (airlock cycles and suit refills). Game value.'),
    researchGain: simple(4, 'points', 'Research earned when the extra task is completed in the action phase.'),
  },
  divertPowerToShielding: {
    // The power diverted is exactly what the night system then goes without.
    powerFromHeating: simple(12, 'kWh', 'Power moved from tonight\'s heating to the shield: normal minus low heating load (20 - 8).'),
    powerFromGreenhouse: simple(12, 'kWh', 'Power moved from tonight\'s greenhouse to the shield: the whole greenhouse load.'),
    shieldingGain: simple(12, '%', 'Shielding integrity gained by reinforcing the shield.'),
  },
  skipMaintenance: {
    crewHealthGain: simple(4, '%', 'Crew health regained by resting instead of doing the maintenance shift.'),
    shieldingCost: simple(6, '%', 'Shielding integrity lost because the maintenance was missed.'),
  },
  maintenanceEva: {
    crewHealthCost: simple(3, '%', 'Fatigue from a maintenance spacewalk.'),
    oxygenCost: simple(1, 'kg', 'Oxygen lost through the airlock and used by the suit. Game value.'),
    shieldingGain: simple(10, '%', 'Shielding integrity restored when the repair is completed in the action phase.'),
  },
  cleanSolarPanels: {
    crewHealthCost: simple(2, '%', 'Fatigue from a spacewalk to brush dust off the panels.'),
    oxygenCost: simple(1, 'kg', 'Oxygen lost through the airlock and used by the suit. Game value.'),
    powerGain: simple(15, 'kWh', 'Extra charge collected once the panels are clean. Real fact for context: Mars dust cut power to NASA\'s Spirit and Opportunity rovers.'),
  },
  boostOxygenGenerator: {
    oxygenGain: simple(2, 'kg', 'Extra oxygen made by running the generator harder.'),
    // NASA_BASED: splitting water releases 16 kg of oxygen per 18 kg of water (chemistry); the ISS makes its oxygen this way.
    waterCost: nasa(2.25, 'kg', 'Water split to make 2 kg of oxygen: 1.125 kg of water per kg of oxygen (H2O is 18 g/mol, O is 16 g/mol). The ISS oxygen generator uses this electrolysis reaction (NASA).'),
    powerCost: simple(10, 'kWh', 'Energy for the extra electrolysis. Game value, rounded up from the theoretical minimum of about 4.9 kWh per kg of oxygen.'),
  },
  pushWaterRecycler: {
    waterGain: simple(3, 'kg', 'Extra water recovered by running the recycler at full power.'),
    powerCost: simple(4, 'kWh', 'Energy for the extra recycling.'),
  },
  rationMeals: {
    foodGain: simple(2, 'kg', 'Food saved by serving smaller meals for a sol.'),
    crewHealthCost: simple(3, '%', 'Crew health lost to hunger and low energy.'),
  },
  restDay: {
    crewHealthGain: simple(6, '%', 'Crew health regained by a full rest day.'),
    foodCost: simple(1.5, 'kg', 'An extra recovery meal for the crew.'),
  },
  boostGreenhouseLights: {
    foodGain: simple(1.5, 'kg', 'Extra food grown with longer light hours.'),
    powerCost: simple(8, 'kWh', 'Energy for the extra grow lights.'),
    waterCost: simple(1, 'kg', 'Extra irrigation water.'),
  },
  reportToEarth: {
    researchGain: simple(2, 'points', 'Research credited when results are sent to Earth.'),
    powerCost: simple(3, 'kWh', 'Energy for the long-range radio session.'),
  },
} as const;
