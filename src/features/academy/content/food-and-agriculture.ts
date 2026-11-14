import { Lightbulb, Mountain, Package, Salad, Sprout, Truck } from 'lucide-react';
import type { Lesson } from '../lessonTypes';

/** How well a plant does for one setting: best at `ideal`, falling away on both sides. */
function suitability(value: number, ideal: number, spread: number): number {
  return Math.max(0, 1 - Math.abs(value - ideal) / spread);
}

export const lesson: Lesson = {
  moduleId: 'food-and-agriculture',
  intro: [
    'What did you have for dinner? Now imagine the nearest shop is 400 km straight down.',
    'Or, if you were on Mars, millions of kilometres away, with the next delivery months off.',
    "That's why astronauts are learning to become farmers. No soil needed!",
  ],
  cards: [
    {
      title: "Why can't astronauts depend only on food deliveries?",
      icon: Truck,
      text: 'Cargo ships reach the space station every few months. A trip to Mars takes six months or more, and food slowly loses vitamins in storage. The farther from Earth people go, the more they will need to grow food themselves.',
    },
    {
      title: 'How is food stored in space?',
      icon: Package,
      keywords: 'eat eating meal meals dinner',
      text: "Most space food is freeze-dried (just add water) or heat-treated and sealed in pouches so it lasts for months without a fridge. Crumbs are a hazard because they float into equipment, so astronauts use tortillas where you'd use bread.",
      fact: { kind: 'today', text: 'Salt and pepper come as liquids so the grains cannot float away.' },
    },
    {
      title: 'What is hydroponics?',
      icon: Sprout,
      text: 'Hydroponics means growing plants without soil. The roots sit in water that has all the nutrients the plant needs dissolved in it. It uses far less water than a field, and it works indoors, anywhere there is light.',
      fact: { kind: 'today', text: 'Hydroponic farms already grow lettuce, tomatoes and herbs on Earth.' },
    },
    {
      title: 'How can plants grow in space?',
      icon: Salad,
      text: "The station's small gardens use LED lights and special root \"pillows\" that hold water, because in microgravity water forms floating blobs. With no gravity to guide them, plants use the direction of the light to work out which way is up.",
      fact: { kind: 'today', text: 'In 2015, ISS astronauts ate lettuce grown in space for the first time.' },
    },
    {
      title: 'What do plants need to grow?',
      icon: Lightbulb,
      text: 'Light, water, nutrients, carbon dioxide from the air, the right temperature and room for their roots. Plants give something back too: they take in carbon dioxide and release oxygen, and caring for them lifts the crew\'s mood.',
    },
    {
      title: 'How might astronauts grow food on the Moon or Mars?',
      icon: Mountain,
      text: 'Probably in sealed greenhouses with hydroponics and LED lights. The local "soil" is crushed rock with no nutrients, and Martian dirt contains chemicals that are toxic to people, so it would need cleaning first.',
      fact: { kind: 'research', text: 'In 2022, scientists grew small plants in real Moon soil brought back by Apollo. They grew, but struggled.' },
    },
  ],
  explore: {
    kind: 'slider',
    title: 'Grow lab',
    instructions: 'Adjust the light, water and nutrients for your lettuce. Too little is bad, but so is too much!',
    goal: 'Get plant health to 80% or more.',
    sliders: [
      { id: 'light', label: 'Light each day', min: 0, max: 24, step: 1, initial: 4, unit: 'hours' },
      { id: 'water', label: 'Water flow', min: 0, max: 100, step: 5, initial: 10, unit: '%' },
      { id: 'nutrients', label: 'Nutrient strength', min: 0, max: 100, step: 5, initial: 10, unit: '%' },
    ],
    compute: (v) => {
      const light = suitability(v.light ?? 0, 16, 14);
      const water = suitability(v.water ?? 0, 60, 55);
      const nutrients = suitability(v.nutrients ?? 0, 50, 50);
      const health = Math.round(light * water * nutrients * 100);
      const weakest = Math.min(light, water, nutrients);
      const status = (score: number) => (score >= 0.9 ? 'good' : score >= 0.6 ? 'warn' : 'bad');
      const hint = (name: string, value: number, ideal: number) => `${name} is the biggest problem: there is too ${value < ideal ? 'little' : 'much'} of it.`;
      const message =
        health >= 80
          ? 'Your lettuce is thriving! Harvest time soon.'
          : weakest === light
            ? hint('Light', v.light ?? 0, 16)
            : weakest === water
              ? hint('Water', v.water ?? 0, 60)
              : hint('Nutrient strength', v.nutrients ?? 0, 50);
      return {
        success: health >= 80,
        message,
        readouts: [
          { label: 'Plant health', value: `${health}%`, level: health / 100, status: status(health / 100 + 0.1) },
          { label: 'Light', value: light >= 0.9 ? 'Just right' : (v.light ?? 0) < 16 ? 'Too little' : 'Too much', level: light, status: status(light) },
          { label: 'Water', value: water >= 0.9 ? 'Just right' : (v.water ?? 0) < 60 ? 'Too little' : 'Too much', level: water, status: status(water) },
          { label: 'Nutrients', value: nutrients >= 0.9 ? 'Just right' : (v.nutrients ?? 0) < 50 ? 'Too little' : 'Too much', level: nutrients, status: status(nutrients) },
        ],
      };
    },
    modelNote: 'Simplified model. Real plants have a "just right" range for each need, but the exact numbers differ for every crop.',
  },
  quiz: [
    {
      question: 'What is hydroponics?',
      options: ['Growing plants in moon dust', 'Growing plants in nutrient-rich water without soil', 'Freeze-drying vegetables', 'Watering plants with a hose'],
      answer: 1,
      explanation: 'In hydroponics, roots take everything they need from water with nutrients dissolved in it.',
    },
    {
      question: 'Why do astronauts eat tortillas where you would eat bread?',
      options: ['Bread is too heavy', 'Tortillas grow in space', 'Bread makes crumbs that float into equipment', 'Bread needs gravity to taste good'],
      answer: 2,
      explanation: 'Floating crumbs can get into eyes, lungs and machines.',
    },
    {
      question: 'With no gravity, how do space plants know which way to grow?',
      options: ['They grow towards the light', 'They cannot grow at all', 'Astronauts turn them daily', 'They follow magnets'],
      answer: 0,
      explanation: 'Plants sense light, so LED lamps show them which way is "up".',
    },
    {
      question: 'Which of these is NOT something plants need?',
      options: ['Light', 'Water', 'Nutrients', 'Total darkness'],
      answer: 3,
      explanation: 'Plants need light to make their food through photosynthesis.',
    },
    {
      question: 'Why is growing food more important for a Mars mission than for the space station?',
      options: ['Mars food tastes better', 'Deliveries from Earth would take many months', 'There is no storage on Mars', 'Astronauts get hungrier on Mars'],
      answer: 1,
      explanation: 'Mars is so far away that regular deliveries are not practical.',
    },
  ],
  challenge: {
    title: 'The wilting crop',
    scenario: 'Your first lettuce crop is turning yellow and droopy. NOLA helps you investigate.',
    steps: [
      {
        prompt: 'The leaves are pale and stretched thin, leaning to one side. What is most likely wrong?',
        options: [
          { text: 'Not enough light', correct: true, feedback: 'Yes. Plants stretch and lean when they are searching for light.' },
          { text: 'Too much gravity', correct: false, feedback: 'There is very little gravity here, and plants cope with that.' },
          { text: 'They are bored', correct: false, feedback: 'Plants do not get bored, but they do need light!' },
        ],
      },
      {
        prompt: 'You find one LED panel has failed. Power is limited today. What do you do?',
        options: [
          { text: 'Give up on the crop', correct: false, feedback: "Don't give up yet. There is a simple fix." },
          { text: 'Move the plants under the working lights', correct: true, feedback: 'Smart. That fixes the problem without using any extra power.' },
          { text: 'Double the water to make up for it', correct: false, feedback: 'Extra water cannot replace light, and too much water rots roots.' },
        ],
      },
      {
        prompt: 'The crop recovers. When you harvest, what should you do with the growing tray?',
        options: [
          { text: 'Leave it empty', correct: false, feedback: 'An empty tray grows nothing. Food takes time, so keep planting.' },
          { text: 'Plant the next crop straight away', correct: true, feedback: 'Exactly. Plants take weeks to grow, so a good farmer always has the next crop started.' },
          { text: 'Throw it away', correct: false, feedback: 'Equipment is precious in space. Reuse it!' },
        ],
      },
    ],
    success: 'Harvest saved! You diagnosed the problem like a real space farmer.',
  },
};
