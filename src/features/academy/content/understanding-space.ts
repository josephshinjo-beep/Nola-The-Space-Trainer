import { Earth, Feather, Orbit, Satellite, Shirt, Skull } from 'lucide-react';
import type { Lesson } from '../lessonTypes';

export const lesson: Lesson = {
  moduleId: 'understanding-space',
  intro: [
    "Welcome, cadet! Before you can run a space station, you need to know what you're up against.",
    'Space is beautiful, but it has no air, wild temperatures and invisible radiation. Humans were not built for it.',
    "The good news? Clever engineering lets people live there for months. Let's find out how!",
  ],
  cards: [
    {
      title: 'What is space?',
      icon: Orbit,
      text: "Space begins about 100 km above your head, where Earth's air becomes too thin to matter. Beyond that it is almost completely empty: a near-vacuum. With no air to carry it, sound cannot travel, so space is silent.",
      fact: { kind: 'today', text: 'The 100 km boundary is called the Kármán line.' },
    },
    {
      title: "Why can't humans survive in space without protection?",
      icon: Skull,
      text: 'There is no air to breathe and no air pressure pushing on your body. Without pressure you would pass out in about 15 seconds. On top of that, sunlight is scorching, shadow is freezing, and harmful radiation is everywhere.',
    },
    {
      title: 'What is microgravity?',
      icon: Feather,
      text: "Astronauts float, but not because gravity is gone. At the height of the space station, gravity is still about 90% as strong as on the ground! The station is constantly falling around the Earth, and everything inside falls with it. That endless fall feels like floating.",
      fact: { kind: 'today', text: 'Falling around a planet without hitting it is called being in orbit.' },
    },
    {
      title: 'Why do astronauts need spacesuits?',
      icon: Shirt,
      text: 'A spacesuit is a tiny personal spacecraft. It supplies oxygen, keeps pressure on the body, controls temperature, blocks some radiation and tiny bits of space dust, and carries a radio so the astronaut can talk.',
    },
    {
      title: 'What is a space station?',
      icon: Satellite,
      text: 'A space station is a home and science lab that orbits a planet. The International Space Station flies about 400 km up at roughly 28,000 km/h, circling Earth every 90 minutes. Its crew sees about 16 sunrises every day.',
      fact: { kind: 'today', text: 'People have lived on the ISS without a break since November 2000.' },
    },
    {
      title: 'How are Earth, the Moon and Mars different?',
      icon: Earth,
      text: "Earth has breathable air, liquid water and a protective magnetic field. The Moon has almost no air and one sixth of Earth's gravity. Mars has thin air made mostly of carbon dioxide, about one third of Earth's gravity, and an average temperature near −60 °C.",
    },
  ],
  explore: {
    kind: 'sort',
    title: 'Three worlds',
    instructions: 'Read each clue and decide which world it describes.',
    bins: [
      { id: 'earth', label: 'Earth' },
      { id: 'moon', label: 'The Moon' },
      { id: 'mars', label: 'Mars' },
    ],
    items: [
      { text: 'You can breathe the air here without a suit.', bin: 'earth', why: 'Only Earth has air with the right mix of oxygen at the right pressure.' },
      { text: 'It has almost no air at all.', bin: 'moon', why: "The Moon's gravity is too weak to hold on to an atmosphere." },
      { text: 'Its thin air is mostly carbon dioxide.', bin: 'mars', why: "Mars has an atmosphere, but it is about 100 times thinner than Earth's and has almost no oxygen." },
      { text: "Gravity is about one sixth of Earth's.", bin: 'moon', why: 'That is why Apollo astronauts could bounce along in heavy suits.' },
      { text: "Gravity is about one third of Earth's.", bin: 'mars', why: "Mars is smaller than Earth, so its pull is weaker: about 38% of Earth's." },
      { text: 'Liquid water flows across the surface.', bin: 'earth', why: 'Earth is the only world we know with oceans, rivers and rain.' },
      { text: 'A trip from Earth takes about three days.', bin: 'moon', why: 'The Moon is about 384,000 km away, close enough for a three-day journey.' },
      { text: 'A trip from Earth takes six months or more.', bin: 'mars', why: 'Mars is millions of kilometres away, even at its closest.' },
    ],
  },
  quiz: [
    {
      question: 'Why do astronauts float inside the space station?',
      options: ['There is no gravity in space', 'The station and everything in it are falling around the Earth', 'The station has anti-gravity machines', 'Space pushes them upwards'],
      answer: 1,
      explanation: 'Gravity is still strong up there. The station is in constant free fall around Earth, and that feels like floating.',
    },
    {
      question: 'What is the main reason space is silent?',
      options: ['It is too cold for sound', 'It is too far away', 'There is almost no air to carry sound', 'Stars absorb the sound'],
      answer: 2,
      explanation: 'Sound is a vibration that needs something to travel through, like air. Space is a near-vacuum.',
    },
    {
      question: 'Which of these does a spacesuit NOT need to do?',
      options: ['Supply oxygen', 'Keep pressure on the body', 'Create gravity', 'Control temperature'],
      answer: 2,
      explanation: 'A suit provides air, pressure, temperature control and protection. It cannot make gravity.',
    },
    {
      question: 'About how long does the International Space Station take to circle the Earth?',
      options: ['90 minutes', '24 hours', 'One week', 'One month'],
      answer: 0,
      explanation: 'At about 28,000 km/h, the ISS completes an orbit roughly every 90 minutes.',
    },
    {
      question: 'What is the air on Mars mostly made of?',
      options: ['Oxygen', 'Nitrogen', 'Helium', 'Carbon dioxide'],
      answer: 3,
      explanation: "Mars's thin atmosphere is about 95% carbon dioxide, so humans could not breathe it.",
    },
  ],
  challenge: {
    title: 'Spacewalk check',
    scenario: 'You are about to step outside the station to inspect a solar panel. NOLA runs the final suit check with you.',
    steps: [
      {
        prompt: 'Your suit display shows the pressure is dropping slowly. What do you do?',
        options: [
          { text: 'Go outside anyway; it is only a small drop', correct: false, feedback: 'Without pressure your body cannot work properly. A leaking suit is never safe.' },
          { text: 'Stay inside and find the leak first', correct: true, feedback: 'Right. Pressure is one of the most important things a suit provides.' },
          { text: 'Hold your breath while outside', correct: false, feedback: "Holding your breath won't help. Your body needs steady pressure and oxygen." },
        ],
      },
      {
        prompt: 'Suit fixed! Outside, you move from bright sunlight into shadow. What does the suit need to handle?',
        options: [
          { text: 'A huge swing in temperature', correct: true, feedback: 'Exactly. Sunlit surfaces can be hotter than boiling water and shadows far below freezing.' },
          { text: 'A sudden change in gravity', correct: false, feedback: 'Gravity does not change when you move into shadow. Temperature does.' },
          { text: 'Loud noise', correct: false, feedback: 'Space is silent. The big change is temperature.' },
        ],
      },
      {
        prompt: 'You let go of your tool for a second. What happens to it?',
        options: [
          { text: 'It drops down towards the Earth', correct: false, feedback: 'It is in orbit just like you, so it does not drop.' },
          { text: 'It floats beside you, slowly drifting away', correct: true, feedback: 'Yes! It is falling around the Earth at the same speed as you. That is why tools are tied on.' },
          { text: 'It shoots off into deep space', correct: false, feedback: 'Nothing pushed it, so it just drifts gently nearby.' },
        ],
      },
    ],
    success: 'Spacewalk complete! You understand what makes space dangerous, and how astronauts stay safe.',
  },
};
