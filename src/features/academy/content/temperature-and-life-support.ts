import { Fan, Heater, Layers, Snowflake, ThermometerSun, UserCheck } from 'lucide-react';
import type { Lesson } from '../lessonTypes';

export const lesson: Lesson = {
  moduleId: 'temperature-and-life-support',
  intro: [
    'Riddle time! Where can you be boiling hot and freezing cold at the very same moment?',
    'Answer: in space, with one side in sunlight and the other in shadow.',
    "Keeping a habitat at a comfy temperature is trickier than you'd think. Let's see how it's done.",
  ],
  cards: [
    {
      title: 'Why can temperatures in space be so extreme?',
      icon: ThermometerSun,
      text: 'On Earth, air spreads heat around and evens things out. Space has no air. A surface in direct sunlight keeps heating up, and one in shadow keeps cooling down. The outside of the space station swings from about +120 °C in sunlight to about −150 °C in shadow.',
    },
    {
      title: 'How does heat move?',
      icon: Fan,
      text: 'Heat travels in three ways: by touch (conduction), by moving air or liquid (convection), and as invisible infrared light (radiation). In the vacuum of space there is no air, so the only way for a spacecraft to lose heat is to radiate it away.',
    },
    {
      title: 'How do spacecraft stay at a comfortable temperature?',
      icon: UserCheck,
      text: "Surprise: the station's main problem is getting rid of heat! Computers, machines and people all give off warmth. Liquid flowing through pipes collects that heat and carries it to large radiator panels outside, which release it into space.",
      fact: { kind: 'today', text: 'The ISS radiator panels are separate from its solar panels and always point away from the Sun.' },
    },
    {
      title: 'What is thermal insulation?',
      icon: Layers,
      text: 'Insulation slows heat from moving. Spacecraft are wrapped in blankets made of many thin, shiny layers. They reflect sunlight away and keep warmth in, a bit like a very advanced vacuum flask. That is the gold or silver foil you see on satellites.',
    },
    {
      title: 'How do heating and cooling systems work together?',
      icon: Heater,
      text: 'Electric heaters keep cold parts, like water pipes, from freezing. Cooling loops stop warm parts from overheating. Sensors and computers switch them on and off automatically to hold everything steady. Spacesuits even have underwear with cooling water tubes.',
    },
    {
      title: 'Why is temperature control important?',
      icon: Snowflake,
      text: 'People work best at around 18 to 27 °C. Outside that range, water pipes can freeze, batteries and computers can fail, and the crew can become ill. A Moon base would face nights near −170 °C that last two weeks.',
      fact: { kind: 'today', text: 'Temperature control uses electricity, so it is linked to the power system.' },
    },
  ],
  explore: {
    kind: 'slider',
    title: 'Just right',
    instructions: 'The station moves between full sunlight and shadow. Set the sunlight, then balance the heater and radiator.',
    goal: 'Bring the cabin to a comfortable 18 to 27 °C. Try it in full sunlight (100%) and in shadow (0%).',
    sliders: [
      { id: 'sun', label: 'Sunlight on the station', min: 0, max: 100, step: 10, initial: 100, unit: '%' },
      { id: 'heater', label: 'Heater power', min: 0, max: 100, step: 5, initial: 50, unit: '%' },
      { id: 'radiator', label: 'Radiator cooling', min: 0, max: 100, step: 5, initial: 10, unit: '%' },
    ],
    compute: (v) => {
      const temperature = Math.round(-12 + 0.7 * (v.sun ?? 0) + 0.5 * (v.heater ?? 0) - 0.5 * (v.radiator ?? 0));
      const success = temperature >= 18 && temperature <= 27;
      const tooHot = temperature > 27;
      return {
        success,
        message: success
          ? 'Comfortable! Now change the sunlight and see what you need to adjust.'
          : tooHot
            ? 'Too hot. Turn the heater down or the radiator up.'
            : 'Too cold. Turn the heater up or the radiator down.',
        readouts: [
          {
            label: 'Cabin temperature',
            value: `${temperature} °C (${success ? 'comfortable' : tooHot ? 'too hot' : 'too cold'})`,
            level: Math.min(1, Math.max(0, (temperature + 20) / 100)),
            status: success ? 'good' : Math.abs(temperature - 22) <= 12 ? 'warn' : 'bad',
          },
        ],
      };
    },
    modelNote: 'Simplified model. Real thermal control balances many heat sources, but the idea is the same: more cooling in sunlight, more heating in shadow.',
  },
  quiz: [
    {
      question: 'Why does one side of a spacecraft get very hot while the other gets very cold?',
      options: ['The engines heat one side', 'There is no air to spread the heat around', 'Space is always hot', 'The crew sits on one side'],
      answer: 1,
      explanation: 'Without air to even things out, sunlit surfaces heat up and shaded ones cool down.',
    },
    {
      question: 'What is the only way a spacecraft can get rid of heat in the vacuum of space?',
      options: ['Blowing it away with fans', 'Pouring it out', 'Radiating it as infrared light', 'Opening a window'],
      answer: 2,
      explanation: 'With no air outside, heat can only leave by radiation, which is the job of radiator panels.',
    },
    {
      question: 'What does the shiny multi-layer blanket on a spacecraft do?',
      options: ['Reflects sunlight and slows heat from moving', 'Makes electricity', 'Makes the craft look nice', 'Holds the craft together'],
      answer: 0,
      explanation: 'It is insulation: many thin reflective layers.',
    },
    {
      question: "What is often the space station's main temperature problem?",
      options: ['It is always freezing inside', 'There are no thermometers', 'The crew wears too many clothes', 'Getting rid of extra heat from machines and people'],
      answer: 3,
      explanation: 'Equipment and people produce heat that must be carried to the radiators.',
    },
    {
      question: 'What can happen if a habitat gets too cold?',
      options: ['Solar panels work better', 'Water pipes can freeze and equipment can fail', 'Nothing', 'Gravity increases'],
      answer: 1,
      explanation: 'Frozen pipes and failing batteries are serious dangers.',
    },
  ],
  challenge: {
    title: 'Into the shadow',
    scenario: 'The station is about to pass into Earth\'s shadow for 35 minutes. NOLA asks you to prepare the thermal systems.',
    steps: [
      {
        prompt: 'What will the temperature outside do as you enter the shadow?',
        options: [
          { text: 'Fall very quickly', correct: true, feedback: 'Right. With no sunlight and no air, surfaces cool fast.' },
          { text: 'Stay exactly the same', correct: false, feedback: 'Sunlight was the heat source. Without it, things cool down.' },
          { text: 'Rise', correct: false, feedback: 'There is nothing to heat the station in the shadow.' },
        ],
      },
      {
        prompt: 'A sensor shows a water pipe near the outer wall is close to freezing. What do you do?',
        options: [
          { text: 'Turn on the heater for that pipe', correct: true, feedback: 'Exactly what heaters are for: protecting parts that must not freeze.' },
          { text: 'Turn the radiators to maximum', correct: false, feedback: 'Radiators remove heat. That would make the pipe colder.' },
          { text: 'Wait for the sunlight to return', correct: false, feedback: 'The pipe could freeze and burst before then.' },
        ],
      },
      {
        prompt: 'Back in sunlight, the computer room is getting too warm. What now?',
        options: [
          { text: 'Add more heaters', correct: false, feedback: 'It is already too warm!' },
          { text: 'Wrap the computers in blankets', correct: false, feedback: 'That would trap the heat in.' },
          { text: 'Send more of its heat to the radiators', correct: true, feedback: 'Yes. The cooling loop carries the extra heat outside to be radiated away.' },
        ],
      },
    ],
    success: 'Perfectly balanced! Heaters in the cold, radiators in the heat. You are a thermal engineer now.',
  },
};
