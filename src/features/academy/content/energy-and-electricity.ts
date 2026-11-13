import { BatteryCharging, Cable, Plug, PowerOff, Sun, Zap } from 'lucide-react';
import type { Lesson } from '../lessonTypes';

export const lesson: Lesson = {
  moduleId: 'energy-and-electricity',
  intro: [
    'Quick question: what do the air machine, the water recycler and the plant lights all have in common?',
    'They all stop the moment the electricity does.',
    'Power is the heartbeat of a space station. Time to learn where it comes from!',
  ],
  cards: [
    {
      title: 'Why do space stations need electricity?',
      icon: Plug,
      text: 'Electricity runs life support (air, water and temperature), plus lights, computers, radios and science experiments. Without power, a station would quickly become impossible to live in.',
      fact: { kind: 'today', text: "The ISS's solar arrays can supply enough power for more than 40 homes." },
    },
    {
      title: 'How do solar panels generate power?',
      icon: Sun,
      text: 'Solar panels are made of cells, usually silicon. When sunlight hits a cell, it knocks tiny particles called electrons loose, and their movement is an electric current. In space there is no air or cloud in the way, so sunlight is stronger than on the ground.',
    },
    {
      title: 'Why does the angle of a panel matter?',
      icon: Zap,
      text: "A panel makes the most power when it faces the Sun directly. Tilt it away and the same light is spread over more panel, so each part gets less. That's why station panels slowly rotate to follow the Sun.",
    },
    {
      title: 'What are batteries used for?',
      icon: BatteryCharging,
      text: "For about a third of every orbit, the station is in Earth's shadow, where solar panels make nothing. Batteries charge up in sunlight and take over in the dark, many times a day.",
      fact: { kind: 'today', text: 'A night on the Moon lasts about 14 Earth days. Storing enough energy for it is a big challenge.' },
    },
    {
      title: 'How is electricity shared around a habitat?',
      icon: Cable,
      text: 'Like the wiring in a house, but smarter. Power flows from the panels through switching units to the batteries and equipment. Computers watch every circuit and make sure life support is always served first.',
    },
    {
      title: 'Why is saving energy important?',
      icon: PowerOff,
      text: 'A station can only use what its panels make. If panels are damaged or dusty, the crew must switch off things they can live without. On Mars, sunlight is less than half as strong as at Earth, and dust storms have ended solar-powered missions.',
      fact: { kind: 'research', text: 'Small nuclear reactors are being developed to power future bases through long, dark nights.' },
    },
  ],
  explore: {
    kind: 'slider',
    title: 'Chase the Sun',
    instructions: 'Tilt the solar panel and choose how many systems to run. Watch what happens to the battery.',
    goal: 'Run at least 4 systems and make enough power to keep the battery charging.',
    sliders: [
      { id: 'angle', label: 'Panel tilt away from the Sun', min: 0, max: 90, step: 5, initial: 70, unit: '°' },
      { id: 'systems', label: 'Systems switched on', min: 1, max: 6, step: 1, initial: 2, unit: '' },
    ],
    compute: (v) => {
      const angle = v.angle ?? 0;
      const systems = v.systems ?? 1;
      const power = 12 * Math.cos((angle * Math.PI) / 180);
      const load = systems * 2;
      const charging = power >= load;
      const success = systems >= 4 && charging;
      return {
        success,
        message: success
          ? 'The battery is charging with all key systems running.'
          : !charging
            ? 'You are using more than the panel makes, so the battery is draining. Face the panel towards the Sun.'
            : 'The battery is charging. Now switch on at least 4 systems.',
        readouts: [
          { label: 'Power made', value: `${power.toFixed(1)} kW`, level: power / 12, status: power >= 8 ? 'good' : power >= 4 ? 'warn' : 'bad' },
          { label: 'Power used', value: `${load.toFixed(1)} kW`, level: load / 12, status: charging ? 'good' : 'bad' },
          { label: 'Battery', value: charging ? 'Charging' : 'Draining', level: charging ? 1 : 0.25, status: charging ? 'good' : 'bad' },
        ],
      };
    },
    modelNote: 'The tilt effect is real physics: power falls with the cosine of the angle. The panel size and system loads are made up for this activity.',
  },
  quiz: [
    {
      question: 'What do solar panels turn into electricity?',
      options: ['Heat from the station', 'Sunlight', 'Wind', 'Radio waves'],
      answer: 1,
      explanation: 'Sunlight knocks electrons loose in the solar cells, creating a current.',
    },
    {
      question: 'Why does a space station need batteries?',
      options: ['To keep working when it is in Earth\'s shadow', 'To make the station heavier', 'Because solar panels only work at night', 'For decoration'],
      answer: 0,
      explanation: 'Panels produce nothing in the dark, so batteries take over.',
    },
    {
      question: 'When does a solar panel make the most power?',
      options: ['When it is edge-on to the Sun', 'When it faces away from the Sun', 'When it faces the Sun directly', 'The angle makes no difference'],
      answer: 2,
      explanation: 'Facing the Sun squarely catches the most light.',
    },
    {
      question: 'Power is running low. Which should you switch off LAST?',
      options: ['Games console', 'Spare lights', 'A science experiment', 'The oxygen system'],
      answer: 3,
      explanation: 'Life support always comes first.',
    },
    {
      question: 'Why is solar power harder to use on Mars than near Earth?',
      options: ['Mars has no Sun', 'Sunlight is weaker there and dust covers the panels', 'Panels melt on Mars', 'Mars is always in shadow'],
      answer: 1,
      explanation: 'Mars is farther from the Sun, and its dust storms can block light for weeks.',
    },
  ],
  challenge: {
    title: 'Power drop',
    scenario: 'Halfway through your shift, NOLA warns that the station is making much less power than normal.',
    steps: [
      {
        prompt: 'The panels are undamaged. What could explain the drop?',
        options: [
          { text: 'The panels have drifted and no longer face the Sun', correct: true, feedback: 'Right. A panel tilted away from the Sun makes far less power.' },
          { text: 'The Sun has run out of light', correct: false, feedback: 'The Sun will keep shining for billions of years!' },
          { text: 'The batteries are too full', correct: false, feedback: 'Full batteries do not reduce what the panels can make.' },
        ],
      },
      {
        prompt: 'It will take an hour to realign the panels. The battery is at 30%. What do you do meanwhile?',
        options: [
          { text: 'Turn everything on to use the power while you have it', correct: false, feedback: 'That would drain the battery before the panels are fixed.' },
          { text: 'Switch off non-essential equipment', correct: true, feedback: 'Exactly. Save the stored energy for life support.' },
          { text: 'Switch off the oxygen system to save the most', correct: false, feedback: 'Never life support! Switch off things the crew can live without.' },
        ],
      },
      {
        prompt: 'Panels realigned and power is back. What is the smart next step?',
        options: [
          { text: 'Let the battery recharge before turning everything back on', correct: true, feedback: 'Good planning. A full battery keeps you safe through the next shadow.' },
          { text: 'Forget about it', correct: false, feedback: 'A drained battery leaves you with no safety margin.' },
          { text: 'Tilt the panels away again to test them', correct: false, feedback: 'You just fixed that! Let the system recover.' },
        ],
      },
    ],
    success: 'Power restored! You protected life support and managed your energy like a station commander.',
  },
};
