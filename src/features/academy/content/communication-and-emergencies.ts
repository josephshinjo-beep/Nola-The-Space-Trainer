import { ClipboardList, RadioTower, SatelliteDish, Timer, Users, WifiOff } from 'lucide-react';
import type { Lesson } from '../lessonTypes';

const LIGHT_SPEED_KM_S = 299_792;

function formatDelay(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)} seconds`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${Math.round(seconds - minutes * 60)} s`;
}

export const lesson: Lesson = {
  moduleId: 'communication-and-emergencies',
  intro: [
    'Last module, cadet! And it might be the most important one.',
    'Imagine asking a question and waiting 40 minutes for the answer. On Mars, that would be normal.',
    'So when something goes wrong far from home, the crew has to be ready to handle it. Together.',
  ],
  cards: [
    {
      title: 'How do astronauts communicate with Earth?',
      icon: SatelliteDish,
      text: 'With radio waves. The space station sends its signals through relay satellites to ground stations. For missions far from Earth, three sets of giant dish antennas in the USA, Spain and Australia take turns listening as the planet rotates.',
      fact: { kind: 'today', text: 'That worldwide system is called the Deep Space Network.' },
    },
    {
      title: 'Why can messages be delayed?',
      icon: Timer,
      text: 'Radio waves travel at the speed of light: about 300,000 km every second. That is fast, but space is huge. A signal takes about 1.3 seconds to reach the Moon and between 3 and 22 minutes to reach Mars, depending on where the planets are.',
    },
    {
      title: 'What happens if communication is interrupted?',
      icon: WifiOff,
      text: 'Sometimes the signal is blocked. A spacecraft behind the Moon cannot be heard. About every two years, the Sun sits between Earth and Mars and contact is paused for around two weeks. During those times, the crew must manage on its own.',
    },
    {
      title: 'How do astronauts follow emergency procedures?',
      icon: ClipboardList,
      text: 'They train for emergencies again and again, and use step-by-step checklists so nothing is forgotten under stress. The usual order is: respond to the alarm, make sure everyone is safe, find the problem, fix or isolate it, then report.',
      fact: { kind: 'today', text: 'ISS crews practise for three main emergencies: fire, air leaks and toxic leaks.' },
    },
    {
      title: 'Why are teamwork and problem-solving important?',
      icon: Users,
      text: 'In 1970, an oxygen tank exploded on Apollo 13 on the way to the Moon. The crew and hundreds of engineers on Earth worked together, invented fixes from the materials on board, and brought everyone home safely.',
    },
    {
      title: 'What makes a good crew member in a crisis?',
      icon: RadioTower,
      text: 'Staying calm, speaking clearly and listening carefully. Astronauts repeat instructions back to confirm they heard them correctly. Everyone knows their role, and everyone speaks up if they spot a problem.',
    },
  ],
  explore: {
    kind: 'slider',
    title: 'Signal delay',
    instructions: 'Slide to move your spacecraft farther from Earth and see how long a radio message takes to arrive.',
    goal: 'Travel at least as far as Mars at its closest (about 55 million km) and see how long a reply would take.',
    sliders: [{ id: 'distance', label: 'Distance from Earth (0 = at the Moon)', min: 0, max: 400, step: 5, initial: 0, unit: 'million km' }],
    compute: (v) => {
      const millions = v.distance ?? 0;
      const km = millions === 0 ? 384_400 : millions * 1_000_000;
      const oneWay = km / LIGHT_SPEED_KM_S;
      const place =
        millions === 0
          ? 'At the Moon'
          : millions < 55
            ? 'Between Earth and Mars'
            : millions <= 400
              ? 'Within the range of Mars'
              : 'Beyond Mars';
      const success = millions >= 55;
      return {
        success,
        message: success
          ? `Ask a question here and the answer comes back ${formatDelay(oneWay * 2)} later. A normal chat is impossible!`
          : millions === 0
            ? 'At the Moon the delay is short enough to hold a slightly awkward conversation.'
            : 'Keep going. Mars at its closest is about 55 million km away.',
        readouts: [
          { label: 'Where you are', value: place, level: Math.min(1, millions / 400), status: 'good' },
          { label: 'One-way delay', value: formatDelay(oneWay), level: Math.min(1, oneWay / 1334), status: oneWay < 5 ? 'good' : oneWay < 300 ? 'warn' : 'bad' },
          { label: 'Question and answer', value: formatDelay(oneWay * 2), level: Math.min(1, oneWay / 1334), status: oneWay < 5 ? 'good' : oneWay < 300 ? 'warn' : 'bad' },
        ],
      };
    },
    modelNote: 'This is real physics: delay = distance ÷ the speed of light. Mars ranges from about 55 to 400 million km from Earth.',
  },
  quiz: [
    {
      question: 'How fast do radio signals travel through space?',
      options: ['At the speed of sound', 'At the speed of light', 'At the speed of a rocket', 'Instantly'],
      answer: 1,
      explanation: 'Radio waves are a kind of light and travel at about 300,000 km per second.',
    },
    {
      question: 'About how long does a radio signal take to travel from Earth to the Moon?',
      options: ['1.3 seconds', '1.3 minutes', '13 minutes', '3 hours'],
      answer: 0,
      explanation: 'The Moon is about 384,000 km away, a little over one light-second.',
    },
    {
      question: 'Why must a Mars crew be able to solve emergencies on its own?',
      options: ['Mission control is closed at weekends', 'Radios do not work on Mars', 'Messages take minutes each way, too slow for an emergency', 'Astronauts prefer it'],
      answer: 2,
      explanation: 'With delays of up to 22 minutes each way, help cannot arrive in real time.',
    },
    {
      question: 'Why do astronauts use checklists in an emergency?',
      options: ['To pass the time', 'Because they have not been trained', 'To keep their hands busy', 'So no important step is forgotten under stress'],
      answer: 3,
      explanation: 'Checklists keep actions correct and in order, even when people are under pressure.',
    },
    {
      question: 'What does the story of Apollo 13 show?',
      options: ['Space travel is impossible', 'Teamwork and creative problem-solving can save a mission', 'Radios are unnecessary', 'Only computers solve problems'],
      answer: 1,
      explanation: 'The crew and engineers on Earth worked together to bring the astronauts home.',
    },
  ],
  challenge: {
    title: 'Pressure alarm',
    scenario: 'An alarm sounds: cabin air pressure is slowly dropping. Your base is far from Earth, and messages take 10 minutes each way.',
    steps: [
      {
        prompt: 'What is your first action?',
        options: [
          { text: 'Radio Earth and wait for instructions', correct: false, feedback: 'A reply would take 20 minutes. You need to act now, and report afterwards.' },
          { text: 'Start the emergency checklist and check everyone is safe', correct: true, feedback: 'Right. The checklist is there so you can act immediately.' },
          { text: 'Ignore it; the alarm is probably broken', correct: false, feedback: 'Always treat an alarm as real until you have proved otherwise.' },
        ],
      },
      {
        prompt: 'The crew is safe. A crewmate says, "I think the leak is in the storage module." What do you do?',
        options: [
          { text: 'Close the hatch to that module and watch the pressure', correct: true, feedback: 'Good. Isolating the module tests the idea and protects the rest of the base.' },
          { text: 'Tell them to be quiet', correct: false, feedback: 'Listening to your team is how problems get solved.' },
          { text: 'Open all the hatches', correct: false, feedback: 'That would let the leak affect the whole base.' },
        ],
      },
      {
        prompt: 'With the hatch closed, pressure holds steady. What is the final step?',
        options: [
          { text: 'Go back to sleep', correct: false, feedback: 'Not yet! Others need to know what happened.' },
          { text: 'Reopen the hatch to check again', correct: false, feedback: 'The leak is contained. Keep it that way until it is repaired.' },
          { text: 'Report to Earth: what happened, what you did, what you need', correct: true, feedback: 'Exactly. A clear report lets the team on Earth help plan the repair.' },
        ],
      },
    ],
    success: 'Crisis handled! You acted fast, listened to your team and reported clearly. You are ready to command a station.',
  },
};
