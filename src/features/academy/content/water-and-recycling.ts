import { Droplet, GlassWater, Recycle, Rocket, ShowerHead, Snowflake } from 'lucide-react';
import type { Lesson } from '../lessonTypes';

export const lesson: Lesson = {
  moduleId: 'water-and-recycling',
  intro: [
    'Here is a fact that makes new astronauts pull a funny face.',
    "On the space station, today's drinking water was yesterday's sweat, breath... and pee.",
    "It is cleaner than most tap water on Earth, I promise! Let me show you why recycling water is so important.",
  ],
  cards: [
    {
      title: 'Why is water essential for survival?',
      icon: Droplet,
      text: 'About 60% of your body is water. You can last weeks without food but only about three days without water. A station also needs water for preparing food, washing, and even for making oxygen.',
    },
    {
      title: 'How do astronauts get drinking water?',
      icon: Rocket,
      text: 'Some water arrives from Earth on cargo spacecraft. But water is heavy, and every kilogram launched to orbit costs thousands of dollars. So most of the water on the station is used again and again.',
    },
    {
      title: 'How does water recycling work in space?',
      icon: Recycle,
      text: "The station collects urine, sweat and the moisture in the crew's breath. Urine is distilled: boiled so pure water vapour can be captured. Then everything is filtered, cleaned with heat and chemistry, and tested before anyone drinks it.",
      fact: { kind: 'today', text: 'In 2023, NASA showed the ISS can recover about 98% of its water.' },
    },
    {
      title: 'Why must water be conserved?',
      icon: ShowerHead,
      text: 'An astronaut gets by on roughly 4 litres of water a day for drinking, food and washing. At home, many people use over 100 litres. There are no showers in orbit: crews wash with damp towels and rinse-free shampoo.',
    },
    {
      title: 'How could future space habitats reuse water?',
      icon: Snowflake,
      text: 'A base far from Earth must recycle nearly every drop. It could also mine local ice. Ice has been found in dark craters at the poles of the Moon and under the surface of Mars. Melted and cleaned, it could supply water, oxygen and even rocket fuel.',
      fact: { kind: 'research', text: 'Using local resources like ice is being researched; nobody has done it on another world yet.' },
    },
    {
      title: 'Is recycled water really safe?',
      icon: GlassWater,
      text: 'Yes. Sensors check the water constantly, and it must pass strict purity tests. The whole Earth works the same way: nature has been recycling the same water for billions of years. The station just does it faster.',
    },
  ],
  explore: {
    kind: 'sequence',
    title: 'Build the water loop',
    instructions: 'Put the steps of the station water recycling system in the right order, from first to last.',
    steps: [
      'Collect urine, sweat and moisture from the air',
      'Distil the urine: boil it and capture the clean vapour',
      'Filter out tiny particles',
      'Use heat and chemistry to destroy germs and leftover chemicals',
      'Test the water with purity sensors',
      'Store the clean water, ready to drink',
    ],
    success: 'That is the loop! Collect, distil, filter, clean, test, store. Then it all begins again.',
  },
  quiz: [
    {
      question: 'Why is it so expensive to bring water from Earth?',
      options: ['Water is rare on Earth', 'Water is heavy, and launching mass costs a lot', 'Water freezes in rockets', 'Astronauts dislike Earth water'],
      answer: 1,
      explanation: 'Launch cost depends on mass, and water is heavy: one litre weighs one kilogram.',
    },
    {
      question: 'Which of these does the space station recycle into drinking water?',
      options: ['Only rainwater', 'Only spare drinking water', 'Sea water', 'Urine, sweat and moisture from breath'],
      answer: 3,
      explanation: 'The Water Recovery System collects all three and cleans them thoroughly.',
    },
    {
      question: 'What does "distilling" urine mean?',
      options: ['Boiling it and capturing the clean water vapour', 'Freezing it solid', 'Mixing it with soap', 'Shaking it until it is clear'],
      answer: 0,
      explanation: 'When the water boils off as vapour, the waste is left behind.',
    },
    {
      question: 'About how much of its water can the ISS recover?',
      options: ['About 10%', 'About 50%', 'About 98%', 'None'],
      answer: 2,
      explanation: 'NASA reported reaching the 98% goal in 2023.',
    },
    {
      question: 'Where might a future Moon base find water?',
      options: ['In lunar rivers', 'In ice inside dark polar craters', 'In Moon clouds', 'Nowhere'],
      answer: 1,
      explanation: 'Permanently shadowed craters near the lunar poles hold water ice.',
    },
  ],
  challenge: {
    title: 'The missing litres',
    scenario: "NOLA's morning report shows the water tank is lower than it should be. Something is wrong.",
    steps: [
      {
        prompt: 'What do you check first?',
        options: [
          { text: 'Whether the water recycler is running', correct: true, feedback: 'Good start. If the recycler stops, used water is lost.' },
          { text: 'The colour of the walls', correct: false, feedback: "That won't tell you where the water went." },
          { text: 'The radio', correct: false, feedback: 'Communication matters, but first find out where the water is going.' },
        ],
      },
      {
        prompt: 'The recycler is fine, but a pipe joint is dripping. What now?',
        options: [
          { text: 'Leave it; drops are tiny', correct: false, feedback: 'Tiny drops add up to litres, and loose water can damage equipment.' },
          { text: 'Close the valve to that pipe and repair the joint', correct: true, feedback: 'Right. Stop the loss first, then fix the cause.' },
          { text: 'Pour in extra water to make up for it', correct: false, feedback: 'That wastes even more water without fixing the leak.' },
        ],
      },
      {
        prompt: 'While supplies recover, how should the crew use water?',
        options: [
          { text: 'Carefully: only what is needed until the tank refills', correct: true, feedback: 'Exactly. Conserving gives the recycler time to catch up.' },
          { text: 'As normal', correct: false, feedback: 'With a low tank, normal use could run you dry.' },
          { text: 'Stop drinking completely', correct: false, feedback: 'Never stop drinking. Cut the uses that matter least first.' },
        ],
      },
    ],
    success: 'Leak fixed and the tank is filling again. On a space station, every drop counts.',
  },
};
