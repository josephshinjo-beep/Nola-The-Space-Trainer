import { CloudFog, Filter, FlaskConical, HeartPulse, Siren, Wind } from 'lucide-react';
import type { Lesson } from '../lessonTypes';

export const lesson: Lesson = {
  moduleId: 'oxygen-and-breathing',
  intro: [
    'Take a deep breath. Easy, right? On Earth, the air is just there.',
    'On a space station, every breath of oxygen has to be made on board or carried up by rocket.',
    "And the air you breathe out has to be cleaned too. Let's see how a station keeps its crew breathing.",
  ],
  cards: [
    {
      title: 'Why do humans need oxygen?',
      icon: HeartPulse,
      text: 'Your cells use oxygen to release the energy stored in food. Your blood carries it everywhere, and your brain uses the most. After only a few minutes without oxygen, the brain starts to be harmed.',
      fact: { kind: 'today', text: 'An astronaut uses about 0.84 kg of oxygen every day.' },
    },
    {
      title: 'How do astronauts get breathable air?',
      icon: Wind,
      text: "The air inside the International Space Station is made to match Earth's: about 21% oxygen and 78% nitrogen, at normal pressure. Oxygen is made on board, topped up from tanks delivered by cargo ships, with emergency supplies kept in reserve.",
    },
    {
      title: 'How does an oxygen supply system work?',
      icon: FlaskConical,
      keywords: 'make made get oxygen electrolysis generator air',
      text: 'The station makes oxygen by electrolysis. Electricity from the solar panels splits water into its two parts: oxygen, which the crew breathes, and hydrogen, which is removed. So making air uses both water and power.',
      fact: { kind: 'today', text: 'The ISS Oxygen Generation System works this way right now.' },
    },
    {
      title: 'What is carbon dioxide?',
      icon: CloudFog,
      text: 'Carbon dioxide (CO₂) is the gas you breathe out. On Earth it drifts away and plants use it. In a sealed spacecraft it builds up. Too much causes headaches, dizziness and trouble thinking clearly.',
      fact: { kind: 'today', text: 'Each astronaut breathes out about 1 kg of carbon dioxide a day.' },
    },
    {
      title: 'How do spacecraft remove extra carbon dioxide?',
      icon: Filter,
      text: 'Air is blown through special materials that trap carbon dioxide. The ISS uses beds of a mineral called zeolite, which can be emptied and reused. Simpler spacecraft use canisters of lithium hydroxide, which soak up CO₂ and are then replaced.',
    },
    {
      title: 'What happens when an air supply system stops working?',
      icon: Siren,
      text: 'Alarms sound and the crew switches to backups: stored oxygen tanks, chemical "oxygen candles" and spare CO₂ canisters. Then they repair the fault. Rising carbon dioxide is often the more urgent danger, because it becomes harmful before the oxygen runs low.',
      fact: { kind: 'today', text: 'On Apollo 13, the crew built a CO₂ filter adapter from tape, a bag and a book cover.' },
    },
  ],
  explore: {
    kind: 'slider',
    title: 'Air balance',
    instructions: 'Set the crew size, then adjust the two machines until the air stays safe.',
    goal: 'Keep a crew of 4 or more breathing safely: make at least as much oxygen as they use, and remove at least as much CO₂ as they breathe out.',
    sliders: [
      { id: 'crew', label: 'Crew size', min: 1, max: 6, step: 1, initial: 2, unit: 'people' },
      { id: 'generator', label: 'Oxygen generator power', min: 0, max: 100, step: 5, initial: 20, unit: '%' },
      { id: 'scrubber', label: 'CO₂ scrubber power', min: 0, max: 100, step: 5, initial: 20, unit: '%' },
    ],
    compute: (v) => {
      const crew = v.crew ?? 1;
      const o2Used = crew * 0.84;
      const o2Made = ((v.generator ?? 0) / 100) * 5.04;
      const co2Made = crew * 1.0;
      const co2Removed = ((v.scrubber ?? 0) / 100) * 6;
      const o2Ok = o2Made >= o2Used;
      const co2Ok = co2Removed >= co2Made;
      const success = crew >= 4 && o2Ok && co2Ok;
      const message = success
        ? 'Balanced! The crew can breathe safely.'
        : !o2Ok
          ? 'The crew is using oxygen faster than you are making it.'
          : !co2Ok
            ? 'Carbon dioxide is building up. Turn up the scrubber.'
            : 'The air is safe. Now try it with a crew of 4 or more.';
      return {
        success,
        message,
        readouts: [
          { label: 'Oxygen made', value: `${o2Made.toFixed(1)} of ${o2Used.toFixed(1)} kg needed per day`, level: Math.min(1, o2Made / o2Used), status: o2Ok ? 'good' : 'bad' },
          { label: 'CO₂ removed', value: `${co2Removed.toFixed(1)} of ${co2Made.toFixed(1)} kg produced per day`, level: Math.min(1, co2Removed / co2Made), status: co2Ok ? 'good' : 'bad' },
        ],
      };
    },
    modelNote: 'Simplified model. The daily amounts per astronaut are real; the machine sizes are made up for this activity.',
  },
  quiz: [
    {
      question: 'How does the International Space Station make most of its oxygen?',
      options: ['Plants in every room', 'Splitting water using electricity', 'Collecting it from space', 'Burning fuel'],
      answer: 1,
      explanation: 'Electrolysis uses electricity to split water into oxygen and hydrogen.',
    },
    {
      question: 'What gas do you breathe out that must be removed from the air?',
      options: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Helium'],
      answer: 0,
      explanation: 'Carbon dioxide builds up in a sealed spacecraft and becomes harmful.',
    },
    {
      question: 'Which two things does an electrolysis oxygen system need to keep running?',
      options: ['Soil and sunlight', 'Fuel and fire', 'Water and electricity', 'Ice and wind'],
      answer: 2,
      explanation: 'It splits water using electricity, so it needs a supply of both.',
    },
    {
      question: 'What might a crew feel first if carbon dioxide builds up?',
      options: ['Hunger', 'Headaches and dizziness', 'Feeling cold', 'Nothing at all'],
      answer: 1,
      explanation: 'High CO₂ causes headaches, dizziness and difficulty concentrating.',
    },
    {
      question: 'The oxygen generator has failed. What is the best first move?',
      options: ['Open a window', 'Ignore it until tomorrow', 'Breathe less', 'Switch to backup oxygen, then repair the fault'],
      answer: 3,
      explanation: 'Spacecraft carry backups such as oxygen tanks so the crew has time to fix problems.',
    },
  ],
  challenge: {
    title: 'Bad air alarm',
    scenario: 'An alarm wakes you. NOLA reports that the carbon dioxide level in the station is climbing.',
    steps: [
      {
        prompt: 'What is the most likely cause?',
        options: [
          { text: 'The CO₂ scrubber has stopped working', correct: true, feedback: 'Right. If nothing removes it, the CO₂ you breathe out just keeps building up.' },
          { text: 'The solar panels are too clean', correct: false, feedback: 'Clean panels make more power. They do not add carbon dioxide.' },
          { text: 'There is too much oxygen', correct: false, feedback: 'The alarm is about carbon dioxide, the gas the crew breathes out.' },
        ],
      },
      {
        prompt: 'The scrubber filter is clogged. What do you do while you fetch a new one?',
        options: [
          { text: 'Exercise to stay warm', correct: false, feedback: 'Exercise makes you breathe out even more carbon dioxide.' },
          { text: 'Fit a spare CO₂ canister as a backup', correct: true, feedback: 'Good thinking. Backup canisters soak up CO₂ and buy you time.' },
          { text: 'Switch off the oxygen generator', correct: false, feedback: 'You still need oxygen. The problem is carbon dioxide removal.' },
        ],
      },
      {
        prompt: 'New filter fitted. How do you know the problem is solved?',
        options: [
          { text: 'The alarm light looks nicer', correct: false, feedback: 'Always check the real measurement, not just how things look.' },
          { text: 'You feel fine, so it must be', correct: false, feedback: 'Feelings can fool you. Instruments tell the truth.' },
          { text: 'The CO₂ reading starts to fall on the monitor', correct: true, feedback: 'Exactly. Engineers trust measurements.' },
        ],
      },
    ],
    success: 'Air restored! You kept calm, used a backup and checked the data. That is how real crews work.',
  },
};
