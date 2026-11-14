import { DECISION_AMOUNTS as A, SOL_CONFIG } from './config';
import type { Decision } from './types';

/**
 * The decisions available in each decision phase.
 *
 * The rule: no decision is free. Every decision costs something in at
 * least one resource other than the ones it gives. `validateDecision`
 * enforces this, and the engine refuses to use a decision that breaks it.
 * All amounts come from config.ts.
 *
 * Every decision creates one task for the action phase. Its costs are paid
 * when it is chosen; its gains arrive only when the task is completed.
 */
export const DECISIONS: Decision[] = [
  {
    id: 'extra-research-task',
    title: 'Extra research task',
    summary: 'Spend oxygen from the reserve to run an extra science task. Research is earned only if the task is completed.',
    gains: { research: A.extraResearchTask.researchGain },
    costs: { oxygen: A.extraResearchTask.oxygenCost },
    gainsAfterAction: { taskId: 'extra-research', taskLabel: 'Complete the extra science task' },
  },
  {
    id: 'divert-power-heating',
    title: 'Reinforce shielding (cold night)',
    summary: "Divert tonight's heating power to the radiation shield. The habitat runs cold tonight.",
    gains: { shielding: A.divertPowerToShielding.shieldingGain },
    costs: { power: A.divertPowerToShielding.powerFromHeating },
    deferredCosts: { crewHealth: SOL_CONFIG.health.coldNightLoss },
    nightEffect: 'heatingLow',

    gainsAfterAction: { taskId: 'heater-down', taskLabel: 'Turn the heater down at the Thermal Controller' },
  },
  {
    id: 'divert-power-greenhouse',
    title: 'Reinforce shielding (dark greenhouse)',
    summary: "Divert tonight's greenhouse power to the radiation shield. Tonight's crop does not grow.",
    gains: { shielding: A.divertPowerToShielding.shieldingGain },
    costs: { power: A.divertPowerToShielding.powerFromGreenhouse },
    deferredCosts: { food: SOL_CONFIG.greenhouse.yieldPerSol },
    nightEffect: 'greenhouseOff',

    gainsAfterAction: { taskId: 'lights-off', taskLabel: 'Switch off the grow lights in the Hydroponics Lab' },
  },
  {
    id: 'skip-maintenance',
    title: 'Skip the maintenance shift',
    summary: 'Let the crew rest instead of doing maintenance. The shielding wears down unrepaired.',
    gains: { crewHealth: A.skipMaintenance.crewHealthGain },
    costs: { shielding: A.skipMaintenance.shieldingCost },

    gainsAfterAction: { taskId: 'crew-rest', taskLabel: 'Send the crew to rest at the Med Station' },
  },
  {
    id: 'maintenance-eva',
    title: 'Maintenance spacewalk',
    summary: 'Send crew outside to repair the shield. Tiring, and the airlock loses oxygen. The repair counts only if the task is completed.',
    gains: { shielding: A.maintenanceEva.shieldingGain },
    costs: { crewHealth: A.maintenanceEva.crewHealthCost, oxygen: A.maintenanceEva.oxygenCost },
    gainsAfterAction: { taskId: 'shield-repair', taskLabel: 'Repair the radiation shield outside' },
  },
  {
    id: 'clean-solar-panels',
    title: 'Clean the solar panels',
    summary: 'Brush the dust off the panels for extra charge. A spacewalk: tiring and uses airlock oxygen.',
    gains: { power: A.cleanSolarPanels.powerGain },
    costs: { crewHealth: A.cleanSolarPanels.crewHealthCost, oxygen: A.cleanSolarPanels.oxygenCost },
    gainsAfterAction: { taskId: 'panel-cleaning', taskLabel: 'Clean the dust off the solar panels' },
  },
  {
    id: 'boost-oxygen-generator',
    title: 'Run the oxygen generator harder',
    summary: 'Split extra water into oxygen. Uses water and a lot of power.',
    gains: { oxygen: A.boostOxygenGenerator.oxygenGain },
    costs: { water: A.boostOxygenGenerator.waterCost, power: A.boostOxygenGenerator.powerCost },

    gainsAfterAction: { taskId: 'oxygen-boost', taskLabel: 'Turn up the Oxygen Generator' },
  },
  {
    id: 'push-water-recycler',
    title: 'Run the water recycler at full power',
    summary: 'Recover extra water at the cost of power.',
    gains: { water: A.pushWaterRecycler.waterGain },
    costs: { power: A.pushWaterRecycler.powerCost },

    gainsAfterAction: { taskId: 'water-boost', taskLabel: 'Turn up the Water Recycler' },
  },
  {
    id: 'ration-meals',
    title: 'Ration meals',
    summary: 'Serve smaller meals to save food. The crew feels weaker.',
    gains: { food: A.rationMeals.foodGain },
    costs: { crewHealth: A.rationMeals.crewHealthCost },

    gainsAfterAction: { taskId: 'smaller-meals', taskLabel: 'Pack smaller meals in the Hydroponics Lab' },
  },
  {
    id: 'rest-day',
    title: 'Rest day',
    summary: 'Give the crew a full day off with an extra recovery meal.',
    gains: { crewHealth: A.restDay.crewHealthGain },
    costs: { food: A.restDay.foodCost },

    gainsAfterAction: { taskId: 'rest-checkup', taskLabel: 'Give the crew a check-up at the Med Station' },
  },
  {
    id: 'boost-greenhouse-lights',
    title: 'Longer greenhouse lighting',
    summary: 'Keep the grow lights on longer for a bigger harvest. Uses power and irrigation water.',
    gains: { food: A.boostGreenhouseLights.foodGain },
    costs: { power: A.boostGreenhouseLights.powerCost, water: A.boostGreenhouseLights.waterCost },

    gainsAfterAction: { taskId: 'grow-lights', taskLabel: 'Turn up the grow lights in the Hydroponics Lab' },
  },
  {
    id: 'report-to-earth',
    title: 'Send results to Earth',
    summary: 'Use the long-range radio to send results to mission control.',
    gains: { research: A.reportToEarth.researchGain },
    costs: { power: A.reportToEarth.powerCost },

    gainsAfterAction: { taskId: 'earth-report', taskLabel: 'Send the results from the Antenna Console' },
  },
];

/**
 * Checks the trade-off rule for one decision. Returns a list of problems;
 * an empty list means the decision is valid.
 */
export function validateDecision(decision: Decision): string[] {
  const problems: string[] = [];
  const gains = Object.entries(decision.gains);
  const allCosts = [...Object.entries(decision.costs), ...Object.entries(decision.deferredCosts ?? {})];

  if (gains.length === 0) problems.push('it gives nothing');
  if (allCosts.length === 0) problems.push('it is free: it costs nothing');
  for (const [resource, param] of [...gains, ...allCosts]) {
    if (!param || !(param.value > 0)) problems.push(`its amount for ${resource} must be more than zero`);
  }
  const gainResources = new Set(gains.map(([resource]) => resource));
  if (allCosts.length > 0 && allCosts.every(([resource]) => gainResources.has(resource))) {
    problems.push('it only costs the same resources it gives, so it costs nothing in another resource');
  }
  if (decision.nightEffect && !decision.deferredCosts) problems.push('it changes tonight\'s systems but declares no deferred cost');
  return problems;
}

export function findDecision(id: string): Decision | undefined {
  return DECISIONS.find((decision) => decision.id === id);
}
