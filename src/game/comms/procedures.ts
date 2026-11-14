import type { FaultId } from '../../simulation/types';

/**
 * What the crew can do about each problem: a question from their Academy
 * training, and Mission Control's answer. The science in the right answers
 * matches the lessons; the wrong answers are common mistakes, each with a
 * short reason so the player learns from it.
 */
export interface Procedure {
  /** The Academy module that teaches this. */
  moduleId: string;
  moduleTitle: string;
  question: string;
  options: { text: string; correct: boolean; why: string }[];
  /** What Mission Control radios back. */
  earthReply: string;
}

export const PROCEDURES: Record<FaultId, Procedure> = {
  'oxygen-generator': {
    moduleId: 'oxygen-and-breathing',
    moduleTitle: 'Oxygen and Breathing',
    question: 'The Oxygen Generator has stopped. What should you check first?',
    options: [
      { text: 'Open a hatch to let fresh air in', correct: false, why: 'There is no air outside a space base. Opening a hatch would let the air out!' },
      { text: 'Check it has power and water, then restart it', correct: true, why: 'It makes oxygen by splitting water with electricity, so it needs both.' },
      { text: 'Switch off the Water Recycler to save water', correct: false, why: 'The generator needs water, so less recycling makes things worse.' },
    ],
    earthReply: 'Mission Control: "The generator splits water with electricity. Check its power and water feed, then restart it."',
  },
  'co2-filter': {
    moduleId: 'oxygen-and-breathing',
    moduleTitle: 'Oxygen and Breathing',
    question: 'The CO₂ filter is clogged and the air is getting stale. What is the safe fix?',
    options: [
      { text: 'Turn the Oxygen Generator up and ignore the filter', correct: false, why: 'More oxygen does not remove carbon dioxide. CO₂ would keep building up.' },
      { text: 'Switch off the fans so the filter rests', correct: false, why: 'Without moving air, CO₂ collects around the crew. Fans keep the air mixed.' },
      { text: 'Fit a fresh filter cartridge', correct: true, why: 'The filter traps the CO₂ the crew breathes out. A full one must be replaced.' },
    ],
    earthReply: 'Mission Control: "Swap in a fresh CO₂ filter cartridge. Oxygen alone will not clear the carbon dioxide."',
  },
  'water-leak': {
    moduleId: 'water-and-recycling',
    moduleTitle: 'Water and Recycling',
    question: 'A pipe is leaking. What do you do first?',
    options: [
      { text: 'Close the valve to that pipe, then seal the leak', correct: true, why: 'Stopping the flow first means no more water is lost while you repair it.' },
      { text: 'Mop up the water and carry on', correct: false, why: 'The pipe keeps leaking. Every drop matters when water is recycled again and again.' },
      { text: 'Turn the Water Recycler up to full', correct: false, why: 'The leak would just waste the recycled water faster.' },
    ],
    earthReply: 'Mission Control: "Isolate that pipe: close its valve, then seal the leak."',
  },
  'panel-drift': {
    moduleId: 'energy-and-electricity',
    moduleTitle: 'Energy and Electricity',
    question: 'The solar panels have drifted. How should they point?',
    options: [
      { text: 'Edge-on to the Sun, to protect them', correct: false, why: 'Edge-on panels catch almost no sunlight, so they make almost no power.' },
      { text: 'Straight at the Sun', correct: true, why: 'Panels make the most power when sunlight hits them straight on.' },
      { text: 'It does not matter which way they point', correct: false, why: 'It matters a lot: the more the panel tilts away, the less power it makes.' },
    ],
    earthReply: 'Mission Control: "Turn the panels to face the Sun straight on for full power."',
  },
  'thermal-fault': {
    moduleId: 'temperature-and-life-support',
    moduleTitle: 'Temperature and Life Support',
    question: 'The thermostat is giving strange readings. What do you do?',
    options: [
      { text: 'Turn the heater up to full, just in case', correct: false, why: 'If the reading is wrong, you could overheat the base.' },
      { text: 'Compare it with a second thermometer, then recalibrate it', correct: true, why: 'A second reading shows how wrong the sensor is, so you can set it right.' },
      { text: 'Switch off thermal control for good', correct: false, why: 'In space, a base gets very hot in sunlight and very cold in shadow without it.' },
    ],
    earthReply: 'Mission Control: "Check the sensor against a second thermometer, then recalibrate it."',
  },
  antenna: {
    moduleId: 'communication-and-emergencies',
    moduleTitle: 'Communication and Emergencies',
    question: 'You have lost contact with Earth. What do you do?',
    options: [
      { text: 'Wait for Earth to fix it', correct: false, why: 'Earth cannot hear you or send help until the antenna points at it again.' },
      { text: 'Turn up the radio volume', correct: false, why: 'A louder speaker does not help if the signal never arrives.' },
      { text: 'Realign the antenna to point at Earth', correct: true, why: 'Radio signals travel in a narrow beam, so the antenna must aim at Earth.' },
    ],
    earthReply: '',
  },
};
