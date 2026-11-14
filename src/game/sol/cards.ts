import { Apple, BedDouble, Droplets, FlaskConical, HeartPulse, Lamp, RadioTower, Shield, SunMedium, ThermometerSnowflake, UtensilsCrossed, Wind, Wrench, Zap, type LucideIcon } from 'lucide-react';
import type { SystemId } from '../../features/unlocks/unlockManager';
import { SOL_CONFIG, type Resource } from '../../sol/config';
import { DECISIONS, findDecision } from '../../sol/decisions';
import { whyNot } from '../../sol/engine';
import type { Decision, SolState } from '../../sol/types';
import { findEquipment, type EquipmentId } from '../stationMap';

/**
 * Kid-friendly words for the sol decisions (ages 7-12), and the station
 * machine where each decision's urgent job happens.
 *
 * The rules (what each decision gives and costs) live in src/sol. This file
 * only words them for children. Tests check that every card mentions
 * exactly the resources its decision really gives and takes.
 */

export interface ResourceLabel {
  name: string;
  icon: LucideIcon;
}

export const RESOURCE_LABELS: Record<Resource, ResourceLabel> = {
  oxygen: { name: 'Air', icon: Wind },
  water: { name: 'Water', icon: Droplets },
  food: { name: 'Food', icon: Apple },
  power: { name: 'Power', icon: Zap },
  shielding: { name: 'Shield', icon: Shield },
  crewHealth: { name: 'Crew health', icon: HeartPulse },
  research: { name: 'Science points', icon: FlaskConical },
};

export interface CardLine {
  resource: Resource;
  text: string;
  /** True for a loss that happens tonight, not straight away. */
  tonight?: boolean;
}

export interface KidCard {
  decisionId: string;
  title: string;
  icon: LucideIcon;
  gain: CardLine[];
  lose: CardLine[];
  /** One short sentence about the real science, shown after choosing. */
  whyReal: string;
  /** The urgent job in the station. Its room must be unlocked for the card to appear. */
  urgent: { equipment: EquipmentId; system: SystemId; text: string };
}

export const KID_CARDS: KidCard[] = [
  {
    decisionId: 'extra-research-task',
    title: 'Do an extra experiment',
    icon: FlaskConical,
    gain: [{ resource: 'research', text: 'New science for your mission goal.' }],
    lose: [{ resource: 'oxygen', text: 'Some air from the spare tanks.' }],
    whyReal: 'Astronauts on the space station do fitness experiments, and working hard means breathing more oxygen.',
    urgent: { equipment: 'medstation', system: 'station-access', text: 'Run the experiment at the Med Station.' },
  },
  {
    decisionId: 'divert-power-heating',
    title: 'Shield up, heater down',
    icon: ThermometerSnowflake,
    gain: [{ resource: 'shielding', text: 'A stronger radiation shield.' }],
    lose: [
      { resource: 'power', text: "Power from tonight's heater." },
      { resource: 'crewHealth', text: 'A chilly night makes the crew tired.', tonight: true },
    ],
    whyReal: 'A real space base has only so much power, so turning one machine up means turning another down.',
    urgent: { equipment: 'thermostat', system: 'temperature', text: 'Turn the heater down at the Thermal Controller.' },
  },
  {
    decisionId: 'divert-power-greenhouse',
    title: 'Shield up, lights off',
    icon: Shield,
    gain: [{ resource: 'shielding', text: 'A stronger radiation shield.' }],
    lose: [
      { resource: 'power', text: 'Power from the grow lights.' },
      { resource: 'food', text: "Tonight's plants will not grow.", tonight: true },
    ],
    whyReal: 'Plants need light to grow, and on a space base that light comes from electric lamps.',
    urgent: { equipment: 'growbed', system: 'food', text: 'Switch off the grow lights in the Hydroponics Lab.' },
  },
  {
    decisionId: 'skip-maintenance',
    title: 'Take a break from fixing',
    icon: BedDouble,
    gain: [{ resource: 'crewHealth', text: 'The crew gets a rest.' }],
    lose: [{ resource: 'shielding', text: 'The shield gets a bit weaker.' }],
    whyReal: 'Real space stations need repairs every week, and jobs that get skipped pile up.',
    urgent: { equipment: 'medstation', system: 'station-access', text: 'Send the crew to rest at the Med Station.' },
  },
  {
    decisionId: 'maintenance-eva',
    title: 'Fix the shield outside',
    icon: Wrench,
    gain: [{ resource: 'shielding', text: 'A stronger radiation shield.' }],
    lose: [
      { resource: 'crewHealth', text: 'The crew gets tired.' },
      { resource: 'oxygen', text: 'A little air escapes from the airlock.' },
    ],
    whyReal: 'Astronauts lose a little air every time the airlock opens for a spacewalk.',
    urgent: { equipment: 'monitor', system: 'radiation', text: 'Repair the shield at the Radiation Monitor.' },
  },
  {
    decisionId: 'clean-solar-panels',
    title: 'Dust the solar panels',
    icon: SunMedium,
    gain: [{ resource: 'power', text: 'More power from cleaner panels.' }],
    lose: [
      { resource: 'crewHealth', text: 'The crew gets tired.' },
      { resource: 'oxygen', text: 'A little air escapes from the airlock.' },
    ],
    whyReal: "Mars dust covered the solar panels of NASA's Spirit and Opportunity rovers and cut their power.",
    urgent: { equipment: 'solar', system: 'energy', text: 'Clean the panels at Solar Control.' },
  },
  {
    decisionId: 'boost-oxygen-generator',
    title: 'Make extra air',
    icon: Wind,
    gain: [{ resource: 'oxygen', text: 'More air in the tanks.' }],
    lose: [
      { resource: 'water', text: 'Some water.' },
      { resource: 'power', text: 'Lots of power.' },
    ],
    whyReal: 'The space station really makes its oxygen by splitting water with electricity.',
    urgent: { equipment: 'generator', system: 'oxygen', text: 'Turn up the Oxygen Generator.' },
  },
  {
    decisionId: 'push-water-recycler',
    title: 'Clean more water',
    icon: Droplets,
    gain: [{ resource: 'water', text: 'More clean water.' }],
    lose: [{ resource: 'power', text: 'Some power.' }],
    whyReal: 'The space station turns sweat, breath and even pee back into clean drinking water.',
    urgent: { equipment: 'recycler', system: 'water', text: 'Turn up the Water Recycler.' },
  },
  {
    decisionId: 'ration-meals',
    title: 'Eat smaller meals',
    icon: UtensilsCrossed,
    gain: [{ resource: 'food', text: 'The food lasts longer.' }],
    lose: [{ resource: 'crewHealth', text: 'The crew feels hungry and weak.' }],
    whyReal: 'Astronauts far from Earth must make their food last until the next supply ship arrives.',
    urgent: { equipment: 'growbed', system: 'food', text: 'Pack smaller meals in the Hydroponics Lab.' },
  },
  {
    decisionId: 'rest-day',
    title: 'Have a rest day',
    icon: BedDouble,
    gain: [{ resource: 'crewHealth', text: 'The crew feels much better.' }],
    lose: [{ resource: 'food', text: 'An extra meal.' }],
    whyReal: 'Real astronauts get days off, because tired crews make more mistakes.',
    urgent: { equipment: 'medstation', system: 'station-access', text: 'Give the crew a check-up at the Med Station.' },
  },
  {
    decisionId: 'boost-greenhouse-lights',
    title: 'Grow more food',
    icon: Lamp,
    gain: [{ resource: 'food', text: 'Extra food from the plants.' }],
    lose: [
      { resource: 'power', text: 'Power for the lamps.' },
      { resource: 'water', text: 'Water for the plants.' },
    ],
    whyReal: 'Astronauts have grown and eaten lettuce on the space station, under special lights.',
    urgent: { equipment: 'growbed', system: 'food', text: 'Turn up the grow lights in the Hydroponics Lab.' },
  },
  {
    decisionId: 'report-to-earth',
    title: 'Send results to Earth',
    icon: RadioTower,
    gain: [{ resource: 'research', text: 'Mission control gives you credit.' }],
    lose: [{ resource: 'power', text: 'Power for the big radio.' }],
    whyReal: 'Sending messages across space needs a big, powerful radio, and that uses a lot of electricity.',
    urgent: { equipment: 'antenna', system: 'communication', text: 'Send the results from the Antenna Console.' },
  },
];

export const findCard = (decisionId: string) => KID_CARDS.find((card) => card.decisionId === decisionId);

/** Where the urgent job is, as "the Med Station" or "Solar Control". */
export const urgentPlace = (card: KidCard) => findEquipment(card.urgent.equipment).name;

/** How badly the station needs more of each resource right now (0 = fine, 1 = empty). */
function needs(state: SolState): Partial<Record<Resource, number>> {
  const share = (resource: Resource) => state.resources[resource] / SOL_CONFIG.capacity[resource].value;
  const missionShare = state.sol / SOL_CONFIG.time.missionLengthSols.value;
  const researchShare = state.resources.research / SOL_CONFIG.goal.researchTarget.value;
  return {
    oxygen: 1 - share('oxygen'),
    water: 1 - share('water'),
    food: 1 - share('food'),
    power: 1 - share('power'),
    shielding: 1 - share('shielding'),
    crewHealth: 1 - share('crewHealth'),
    // Science matters more when it falls behind the mission schedule.
    research: Math.max(0, Math.min(1, 0.4 + missionShare - researchShare)),
  };
}

/**
 * Picks up to three cards for this sol. A card can appear only if its
 * urgent job's room is unlocked and its decision can be afforded now.
 * Cards that help with what the station needs most come first, and the
 * three cards try to help with three different things.
 */
export function pickCards(state: SolState, unlocked: readonly SystemId[], count = 3): KidCard[] {
  const need = needs(state);
  const scored = KID_CARDS.map((card, index) => {
    const decision = findDecision(card.decisionId) as Decision;
    const helps = Object.keys(decision.gains) as Resource[];
    // A small rotation by sol, so ties do not always show the same cards.
    const rotation = ((index + state.sol * 5) % KID_CARDS.length) / (KID_CARDS.length * 100);
    return { card, helps, score: Math.max(...helps.map((resource) => need[resource] ?? 0)) + rotation };
  })
    .filter(({ card }) => unlocked.includes(card.urgent.system) && whyNot(state, card.decisionId) === null)
    .sort((a, b) => b.score - a.score);

  const picked: typeof scored = [];
  // First pass: one card per kind of help. Second pass: fill any gaps.
  for (const candidate of scored) {
    if (picked.length < count && !picked.some((p) => p.helps.some((r) => candidate.helps.includes(r)))) picked.push(candidate);
  }
  for (const candidate of scored) {
    if (picked.length < count && !picked.includes(candidate)) picked.push(candidate);
  }
  return picked.map(({ card }) => card);
}

/** Every decision has a card. Checked by the tests. */
export const cardsCoverAllDecisions = () => DECISIONS.every((decision) => findCard(decision.id));
