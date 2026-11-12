import { Droplets, RadioTower, Shield, Sprout, Telescope, Thermometer, Wind, Zap, type LucideIcon } from 'lucide-react';

/**
 * The NOLA Space Survival Academy curriculum.
 *
 * This file is the single list of modules. The Academy pages, Mission
 * Control and (from Batch 2) the Lesson Unlock Manager all read it, so
 * adding a module here is all it takes for it to appear everywhere.
 */

export type ModuleLevel = 'Beginner' | 'Explorer' | 'Advanced';

export interface AcademyModule {
  /** Stable id used in addresses and saved progress. Never rename. */
  id: string;
  number: number;
  title: string;
  /** One-line hook shown on cards. */
  tagline: string;
  level: ModuleLevel;
  icon: LucideIcon;
  /** How NOLA introduces the module. */
  nolaIntro: string;
  /** The big questions the module answers. */
  questions: string[];
  /** The station system that passing this module switches on. */
  unlock: {
    systemId: string;
    name: string;
    description: string;
  };
}

export const CURRICULUM: AcademyModule[] = [
  {
    id: 'understanding-space',
    number: 1,
    title: 'Understanding Space',
    tagline: 'What is out there, and why is it so hard to live in?',
    level: 'Beginner',
    icon: Telescope,
    nolaIntro: "Before we can live in space, we need to know what space is really like. Spoiler: it is not friendly to humans!",
    questions: [
      'What is space?',
      "Why can't humans survive in space without protection?",
      'What is microgravity?',
      'Why do astronauts need spacesuits?',
      'What is a space station?',
      'How are Earth, the Moon and Mars different?',
    ],
    unlock: {
      systemId: 'station-access',
      name: 'Station access',
      description: 'Move your astronaut and explore the station.',
    },
  },
  {
    id: 'oxygen-and-breathing',
    number: 2,
    title: 'Oxygen and Breathing',
    tagline: 'Every breath on a spacecraft has to be made or carried.',
    level: 'Beginner',
    icon: Wind,
    nolaIntro: "You breathe about 20,000 times a day without thinking. In space, somebody has to think about every single breath.",
    questions: [
      'Why do humans need oxygen?',
      'How do astronauts get breathable air?',
      'How does an oxygen supply system work?',
      'What is carbon dioxide?',
      'How do spacecraft remove extra carbon dioxide?',
      'What happens when an air supply system stops working?',
    ],
    unlock: {
      systemId: 'oxygen',
      name: 'Oxygen Control',
      description: 'Run the oxygen management system.',
    },
  },
  {
    id: 'water-and-recycling',
    number: 3,
    title: 'Water and Recycling',
    tagline: 'In space, nothing wet is ever wasted.',
    level: 'Beginner',
    icon: Droplets,
    nolaIntro: "Water is heavy and expensive to launch, so astronauts recycle almost all of it. Yes, even that water.",
    questions: [
      'Why is water essential for survival?',
      'How do astronauts get drinking water?',
      'How does water recycling work in space?',
      'Why must water be conserved?',
      'How could future space habitats reuse water?',
    ],
    unlock: {
      systemId: 'water',
      name: 'Water Recycling',
      description: 'Operate the water recycling station.',
    },
  },
  {
    id: 'food-and-agriculture',
    number: 4,
    title: 'Food and Agriculture',
    tagline: 'Could you grow your dinner without soil?',
    level: 'Explorer',
    icon: Sprout,
    nolaIntro: "Far from Earth, the supply rocket won't always arrive in time. So let's learn to grow food where there is no soil at all.",
    questions: [
      "Why can't astronauts depend only on food deliveries?",
      'How is food stored in space?',
      'What is hydroponics?',
      'How can plants grow in space?',
      'What do plants need to grow?',
      'How might astronauts grow food on the Moon or Mars?',
    ],
    unlock: {
      systemId: 'food',
      name: 'Hydroponics Lab',
      description: 'Grow crops in the hydroponics room.',
    },
  },
  {
    id: 'energy-and-electricity',
    number: 5,
    title: 'Energy and Electricity',
    tagline: 'No power means no air, no water and no lights.',
    level: 'Explorer',
    icon: Zap,
    nolaIntro: "Everything that keeps a crew alive runs on electricity. Let's find out where a space station gets it.",
    questions: [
      'Why do space stations need electricity?',
      'How do solar panels generate power?',
      'What are batteries used for?',
      'How is electricity shared around a habitat?',
      'Why is saving energy important?',
    ],
    unlock: {
      systemId: 'energy',
      name: 'Solar Panels and Batteries',
      description: 'Generate, store and share power.',
    },
  },
  {
    id: 'radiation-protection',
    number: 6,
    title: 'Radiation Protection',
    tagline: 'The danger you cannot see, hear or feel.',
    level: 'Explorer',
    icon: Shield,
    nolaIntro: "Earth quietly protects you from space radiation every day. Out here, we have to build that protection ourselves.",
    questions: [
      'What is space radiation?',
      "Why is radiation a bigger worry beyond Earth's atmosphere?",
      "How do Earth's atmosphere and magnetic field protect us?",
      'How do spacecraft and habitats reduce radiation exposure?',
      'Why are protective materials and shelters important?',
    ],
    unlock: {
      systemId: 'radiation',
      name: 'Radiation Shelter',
      description: 'Monitor radiation and use the shelter.',
    },
  },
  {
    id: 'temperature-and-life-support',
    number: 7,
    title: 'Temperature and Life Support',
    tagline: 'Boiling in sunlight, freezing in shadow.',
    level: 'Advanced',
    icon: Thermometer,
    nolaIntro: "Space can be scorching and freezing at the same time. Keeping a habitat comfy is a real engineering puzzle.",
    questions: [
      'Why can temperatures in space be so extreme?',
      'How do spacecraft stay at a comfortable temperature?',
      'What is thermal insulation?',
      'How do heating and cooling systems work?',
      'Why is temperature control important?',
    ],
    unlock: {
      systemId: 'temperature',
      name: 'Habitat Temperature Controls',
      description: 'Keep the habitat warm, but not too warm.',
    },
  },
  {
    id: 'communication-and-emergencies',
    number: 8,
    title: 'Space Communication and Emergencies',
    tagline: 'When help is millions of kilometres away.',
    level: 'Advanced',
    icon: RadioTower,
    nolaIntro: "Far from Earth, a message can take minutes to arrive. Astronauts must stay calm, work together and solve problems themselves.",
    questions: [
      'How do astronauts communicate with Earth?',
      'Why can messages be delayed?',
      'What happens if communication is interrupted?',
      'How do astronauts follow emergency procedures?',
      'Why are teamwork and problem-solving important in space?',
    ],
    unlock: {
      systemId: 'communication',
      name: 'Communication Room',
      description: 'Contact Earth and take on emergency missions.',
    },
  },
];

/** The six stages every lesson follows. */
export const LESSON_STAGES = [
  { name: 'NOLA Introduces', detail: 'NOLA sets the scene with a friendly chat.' },
  { name: 'Learn', detail: 'Short explanations with pictures and animations.' },
  { name: 'Explore', detail: 'Hands-on diagrams, activities and experiments.' },
  { name: 'Knowledge Check', detail: 'A short quiz. You can always try again.' },
  { name: 'Mission Challenge', detail: 'Solve a problem using what you learned.' },
  { name: 'Unlock', detail: 'Pass, and a new part of your station comes online.' },
] as const;

export function findModule(id: string | undefined): AcademyModule | undefined {
  return CURRICULUM.find((module) => module.id === id);
}
