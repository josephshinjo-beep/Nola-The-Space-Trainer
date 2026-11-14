import type { Resource } from '../../sol/config';
import type { BodyPart } from '../../sol/types';

/**
 * "What is this?" explainers for every resource the player manages, in short
 * sentences that read aloud well (ages 7-12). The "Real science" lines are
 * established facts; the "In the game" lines describe the game's own rules.
 */
export interface Explainer {
  name: string;
  whatItIs: string;
  whyItMatters: string;
  inTheGame: string;
  realScience: string;
  /** A question to ask NOLA for more. */
  askNola: string;
}

export const EXPLAINERS: Record<Resource | BodyPart, Explainer> = {
  oxygen: {
    name: 'Air (oxygen)',
    whatItIs: 'Oxygen is the gas in air that our bodies need to breathe.',
    whyItMatters: 'Without enough oxygen, the crew cannot think clearly, and soon cannot survive.',
    inTheGame: 'The crew breathes some every night. The oxygen generator makes more, using water and power.',
    realScience: 'On the space station, machines split water into oxygen and hydrogen using electricity. This is called electrolysis.',
    askNola: 'How do astronauts get oxygen in space?',
  },
  water: {
    name: 'Water',
    whatItIs: 'Water is for drinking, washing, growing plants and making oxygen.',
    whyItMatters: 'Water is heavy to send from Earth, so every drop is precious.',
    inTheGame: 'The crew uses water every night. The recycler wins most of it back.',
    realScience: 'The space station recycles about 98 percent of its water, even from sweat and urine.',
    askNola: 'How is water recycled on the space station?',
  },
  food: {
    name: 'Food',
    whatItIs: 'Food gives the crew energy to work and stay healthy.',
    whyItMatters: 'A long mission cannot carry all its food, so crews will need to grow some.',
    inTheGame: 'The crew eats every night. The greenhouse grows more when it has power and light.',
    realScience: 'Astronauts have grown and eaten lettuce on the space station.',
    askNola: 'Can astronauts grow food in space?',
  },
  power: {
    name: 'Power',
    whatItIs: 'Power is electricity, stored in batteries.',
    whyItMatters: 'Almost everything runs on power: air, water, heat and lights.',
    inTheGame: 'Solar panels charge the batteries in the day. At night the base runs on the batteries. If there is not enough, machines switch off.',
    realScience: 'Solar panels only make power in sunlight, so spacecraft store energy in batteries for the dark.',
    askNola: 'How do solar panels power a space base?',
  },
  shielding: {
    name: 'Shield',
    whatItIs: 'The shield is the walls and materials that block space radiation.',
    whyItMatters: 'Space radiation can harm the crew. A strong shield blocks more of it.',
    inTheGame: 'The shield wears down a little every night. Repairs and extra power make it stronger.',
    realScience: 'Water and plastics rich in hydrogen are good at blocking radiation, so scientists study them for spacecraft walls.',
    askNola: 'How do astronauts protect themselves from radiation?',
  },
  crewHealth: {
    name: 'Crew health',
    whatItIs: 'Crew health shows how well the astronauts feel overall.',
    whyItMatters: 'If crew health runs out, the mission is over.',
    inTheGame: 'Shortages, cold nights, radiation, weak muscles and tiredness lower it. Good nights raise it.',
    realScience: 'Doctors on Earth check astronauts every day, and astronauts do regular health tests in space.',
    askNola: 'How do astronauts stay healthy in space?',
  },
  research: {
    name: 'Science points',
    whatItIs: 'Science points show the experiments and results your crew has finished.',
    whyItMatters: 'Science is the reason for the mission. Reach the science goal to make it a success.',
    inTheGame: 'Experiments and reports to Earth earn points. Exercise, rest days and sheltering from storms use up science time.',
    realScience: 'Astronauts on the space station spend much of each day doing experiments for scientists on Earth.',
    askNola: 'What experiments do astronauts do in space?',
  },
  muscleBone: {
    name: 'Muscles & bones',
    whatItIs: 'This shows how strong the crew’s muscles and bones are.',
    whyItMatters: 'In weightlessness, muscles and bones do less work, so they get weaker.',
    inTheGame: 'It drops a little every sol. A workout builds it back up. If it gets too low, crew health drops.',
    realScience: 'Mice that spent 33 days on the space station lost a lot of muscle and bone (NASA OSDR study OSD-342).',
    askNola: 'Why do astronauts lose muscle and bone in space?',
  },
  rest: {
    name: 'Rest',
    whatItIs: 'Rest shows how well rested the crew is.',
    whyItMatters: 'Tired crews make more mistakes and feel worse.',
    inTheGame: 'It drops every sol. A rest day or a break from maintenance restores it. If it gets too low, crew health drops.',
    realScience: 'Spaceflight confuses the body’s daily clock, so astronauts plan their sleep carefully (NASA OSDR study OSD-343).',
    askNola: 'How do astronauts sleep in space?',
  },
};

/** The explainer as one block of speech for the Listen button. */
export const explainerSpeech = (e: Explainer) => `${e.name}. ${e.whatItIs} ${e.whyItMatters} In the game: ${e.inTheGame} Real science: ${e.realScience}`;
