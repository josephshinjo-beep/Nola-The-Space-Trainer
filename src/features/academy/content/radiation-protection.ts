import { Atom, Earth, Magnet, Radiation, Shield, Tent } from 'lucide-react';
import type { Lesson } from '../lessonTypes';

export const lesson: Lesson = {
  moduleId: 'radiation-protection',
  intro: [
    "Some dangers in space you can see coming. This one you can't see, hear, smell or feel.",
    'Space radiation zips through the solar system all the time, and now and then the Sun fires out an extra burst.',
    "Don't worry. Once you understand it, you can plan for it. Let's go!",
  ],
  cards: [
    {
      title: 'What is space radiation?',
      icon: Atom,
      text: 'Space radiation is made of tiny particles moving at incredible speeds. Some come from the Sun during solar storms. Others, called cosmic rays, come from exploded stars far across the galaxy. They can pass into the body and damage cells.',
    },
    {
      title: "Why is radiation a bigger worry beyond Earth's atmosphere?",
      icon: Radiation,
      text: 'On the ground you are well shielded. In orbit, astronauts get much more: in about a week, a space station crew member receives roughly as much radiation as a person on Earth gets naturally in a whole year. Farther out, on the way to the Moon or Mars, it is higher still.',
    },
    {
      title: "How does Earth's magnetic field protect us?",
      icon: Magnet,
      text: 'Earth acts like a giant magnet. Its magnetic field stretches far into space and steers many charged particles away from the planet. Some slip in near the poles and light up the sky as the aurora: the northern and southern lights.',
    },
    {
      title: 'How does the atmosphere protect us?',
      icon: Earth,
      text: 'Particles that get past the magnetic field hit the air first. The atmosphere soaks up most of their energy long before they reach the ground. It gives about as much protection as a layer of water ten metres deep.',
    },
    {
      title: 'How do spacecraft and habitats reduce radiation exposure?',
      icon: Shield,
      text: 'With shielding, warnings and good timing. Materials rich in hydrogen, such as water and polyethylene plastic, are good at stopping fast particles. Instruments watch the Sun for storms, and crews wear small detectors that track their exposure.',
      fact: { kind: 'today', text: 'Space weather forecasters watch the Sun around the clock to warn astronauts.' },
    },
    {
      title: 'Why are protective materials and shelters important?',
      icon: Tent,
      text: 'Solar storms are intense but short, lasting hours to a few days. Crews wait them out in the best-shielded part of the craft, often surrounded by water and supplies. Future Moon and Mars bases might be covered with a thick layer of local soil.',
      fact: { kind: 'future', text: 'Building bases under metres of soil, or inside old lava tunnels, is a future habitat concept.' },
    },
  ],
  explore: {
    kind: 'slider',
    title: 'Storm shelter',
    instructions: 'A solar storm will last 8 hours. Choose how thick to make the shelter wall and how long the crew spends outside the shelter.',
    goal: 'Keep the total storm dose at 20 units or less.',
    sliders: [
      { id: 'thickness', label: 'Shelter wall thickness (water)', min: 0, max: 40, step: 2, initial: 4, unit: 'cm' },
      { id: 'outside', label: 'Hours spent outside the shelter', min: 0, max: 8, step: 1, initial: 6, unit: 'hours' },
    ],
    compute: (v) => {
      const thickness = v.thickness ?? 0;
      const outside = v.outside ?? 0;
      const perHour = 12.5;
      const shelterFactor = Math.exp(-thickness / 12);
      const doseOutside = outside * perHour;
      const doseInside = (8 - outside) * perHour * shelterFactor;
      const dose = Math.round(doseOutside + doseInside);
      const success = dose <= 20;
      return {
        success,
        message: success
          ? 'Well protected! Thick shielding and staying inside kept the dose low.'
          : doseOutside > doseInside
            ? 'Most of the dose is from time spent outside the shelter. Get the crew inside sooner.'
            : 'The shelter wall is letting too much through. Make it thicker.',
        readouts: [
          { label: 'Total storm dose', value: `${dose} units`, level: Math.min(1, dose / 100), status: success ? 'good' : dose <= 45 ? 'warn' : 'bad' },
          { label: 'Radiation blocked by the wall', value: `${Math.round((1 - shelterFactor) * 100)}%`, level: 1 - shelterFactor, status: shelterFactor <= 0.2 ? 'good' : shelterFactor <= 0.5 ? 'warn' : 'bad' },
        ],
      };
    },
    modelNote: 'Simplified model with made-up "units". Real shielding depends on the material and the kind of radiation, but two ideas are true: thicker shielding blocks more, and less time exposed means a lower dose.',
  },
  quiz: [
    {
      question: 'Where does space radiation come from?',
      options: ['Only from spacecraft engines', 'From the Moon', 'From the Sun and from exploded stars far away', 'From Earth\'s oceans'],
      answer: 2,
      explanation: 'Solar storms and galactic cosmic rays are the two main sources.',
    },
    {
      question: 'Which two things protect people on Earth from most space radiation?',
      options: ['The magnetic field and the atmosphere', 'Clouds and rain', 'The Moon and the stars', 'Mountains and trees'],
      answer: 0,
      explanation: 'The magnetic field deflects many particles and the atmosphere absorbs most of the rest.',
    },
    {
      question: 'What should a crew do when a solar storm warning arrives?',
      options: ['Go outside to watch', 'Move to the most shielded part of the spacecraft', 'Open the hatches', 'Switch off all instruments'],
      answer: 1,
      explanation: 'Sheltering behind extra shielding greatly reduces the dose.',
    },
    {
      question: 'Which materials are especially good at stopping space radiation?',
      options: ['Thin glass', 'Paper', 'Feathers', 'Hydrogen-rich materials like water and polyethylene'],
      answer: 3,
      explanation: 'Light atoms such as hydrogen are effective at slowing fast particles.',
    },
    {
      question: 'What are the auroras (northern and southern lights)?',
      options: ['Reflections of city lights', 'Charged particles from space lighting up the air near the poles', 'Clouds lit by the Moon', 'Rocket exhaust'],
      answer: 1,
      explanation: "Particles guided in by Earth's magnetic field make the upper air glow.",
    },
  ],
  challenge: {
    title: 'Storm incoming',
    scenario: 'NOLA relays a space weather alert: the Sun has released a burst of particles. It will reach the station in 30 minutes.',
    steps: [
      {
        prompt: 'A crewmate is in the middle of an experiment in a thin-walled module. What should they do?',
        options: [
          { text: 'Finish the experiment first; it is nearly done', correct: false, feedback: 'No experiment is worth extra radiation. Safety first.' },
          { text: 'Make the experiment safe and head to the shelter', correct: true, feedback: 'Right. They have time to tidy up safely, then go.' },
          { text: 'Hide under a desk', correct: false, feedback: 'A desk gives almost no shielding. The shelter does.' },
        ],
      },
      {
        prompt: 'Which spot on the station makes the best shelter?',
        options: [
          { text: 'The room with the biggest window', correct: false, feedback: 'Windows are thin. You want as much material around you as possible.' },
          { text: 'The room surrounded by water tanks and supplies', correct: true, feedback: 'Exactly. Water and packed supplies make excellent shielding.' },
          { text: 'Outside, behind a solar panel', correct: false, feedback: 'Outside is the worst place to be during a storm.' },
        ],
      },
      {
        prompt: 'How do you decide when it is safe to leave the shelter?',
        options: [
          { text: 'When you get bored', correct: false, feedback: 'Radiation cannot be felt, so boredom is no guide.' },
          { text: 'After exactly ten minutes', correct: false, feedback: 'Storms vary. Only measurements can tell you.' },
          { text: 'When the radiation monitor shows levels are back to normal', correct: true, feedback: 'Yes. You cannot sense radiation, so you trust the instruments.' },
        ],
      },
    ],
    success: 'Storm weathered safely! You used warning time, shielding and measurements, the three keys to radiation safety.',
  },
};
