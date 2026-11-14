import type { Passage } from './knowledge';

/**
 * Extra space facts for NOLA's built-in answers: common questions that the
 * eight survival lessons do not cover (planets, the Sun, rockets, NASA).
 *
 * These are used when the AI is switched off or fails, and are also given
 * to the AI as reference material. Keep each one short, well established
 * and suitable for a ten-year-old. Do not add anything you cannot check.
 */

const source = { label: "NOLA's space notes", to: '/academy' };

const fact = (id: string, title: string, text: string, keywords = ''): Passage => ({ id: `fact-${id}`, title, text, keywords, source });

export const SPACE_FACTS: Passage[] = [
  fact(
    'earth-mars-size',
    'Which is bigger, Earth or Mars?',
    'Earth is bigger. Mars is about half as wide as Earth: roughly 6,800 km across compared with about 12,700 km. Mars also has only about a tenth of Earth\'s mass, which is why its gravity is weaker.',
    'bigger smaller size compare larger big small wide diameter',
  ),
  fact(
    'planets',
    'How many planets are in the solar system?',
    'There are eight planets. In order from the Sun: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune. The first four are small and rocky; the last four are giants made mostly of gas and ice. Pluto has been classed as a dwarf planet since 2006.',
    'many number count planet planets names order list pluto dwarf mercury venus jupiter saturn uranus neptune solar system',
  ),
  fact(
    'biggest-planet',
    'What is the biggest planet?',
    'Jupiter is the biggest planet in our solar system. It is about 11 times as wide as Earth, and more than 1,000 Earths could fit inside it. The smallest planet is Mercury.',
    'biggest largest smallest jupiter mercury planet size',
  ),
  fact(
    'sun',
    'What is the Sun?',
    'The Sun is a star: a giant ball of glowing hot gas, mostly hydrogen and helium. It is about 150 million km from Earth, and its light takes about 8 minutes to reach us. Its surface is around 5,500 °C and its centre is about 15 million °C.',
    'sun star hot temperature far distance light made hydrogen helium',
  ),
  fact(
    'moon',
    'What is the Moon?',
    'The Moon is a ball of rock that orbits the Earth, about 384,000 km away. It has almost no air, and its gravity is one sixth of Earth\'s. It does not make its own light: we see it because sunlight bounces off it.',
    'lunar shine light phases',
  ),
  fact(
    'distances',
    'How far away are the Moon and Mars?',
    'The Moon is about 384,000 km from Earth. Mars is much farther, and the gap keeps changing as both planets orbit the Sun: from about 55 million km at its closest to about 400 million km at its farthest.',
    'far away distance close near kilometres miles',
  ),
  fact(
    'earth',
    'What is Earth?',
    'Earth is the third planet from the Sun and the only place known to have life. It has liquid water, air we can breathe, and a magnetic field and atmosphere that shield us from space radiation. It is about 12,700 km wide and 4.6 billion years old.',
    'home planet world special',
  ),
  fact(
    'mars',
    'What is Mars?',
    'Mars is the fourth planet from the Sun, a cold, dusty desert world about half as wide as Earth. Its thin air is mostly carbon dioxide, its gravity is about a third of Earth\'s, and a day there lasts about 24 hours and 40 minutes.',
    'red planet fourth',
  ),
  fact(
    'breathe-elsewhere',
    'Can you breathe on Mars or the Moon?',
    'No. The Moon has almost no air at all, and the air on Mars is very thin and made mostly of carbon dioxide, with almost no oxygen. Astronauts there would need spacesuits and sealed habitats with their own air supply.',
    'breathe breathing air oxygen without suit helmet survive',
  ),
  fact(
    'moon-landing',
    'Who was the first person on the Moon?',
    'Neil Armstrong became the first person to walk on the Moon on 20 July 1969, during NASA\'s Apollo 11 mission, followed by Buzz Aldrin. Twelve astronauts walked on the Moon between 1969 and 1972.',
    'first person man walk moon landing apollo 11 neil armstrong buzz aldrin when landed',
  ),
  fact(
    'mars-red',
    'Why is Mars red?',
    'Mars looks red because its dust and rocks contain a lot of iron oxide, which is the same thing as rust. That is why it is called the Red Planet.',
    'red planet colour color rust iron mars',
  ),
  fact(
    'mars-rovers',
    'What are the Mars rovers?',
    'Rovers are robot cars that explore Mars for us. NASA\'s Curiosity has been driving there since 2012 and Perseverance since 2021. Perseverance carried a small helicopter called Ingenuity, the first aircraft to fly on another planet.',
    'rover rovers robot curiosity perseverance ingenuity helicopter mars explore',
  ),
  fact(
    'black-hole',
    'What is a black hole?',
    'A black hole is a place in space where gravity is so strong that nothing can escape, not even light. Many form when a very large star collapses at the end of its life. Scientists took the first picture of one in 2019.',
    'black hole holes gravity light escape',
  ),
  fact(
    'galaxy',
    'What is a galaxy?',
    'A galaxy is a huge group of stars, gas and dust held together by gravity. Our galaxy is the Milky Way, and it contains more than 100 billion stars. The Sun is just one of them.',
    'galaxy galaxies milky way stars universe',
  ),
  fact(
    'star',
    'What is a star?',
    'A star is a giant ball of very hot gas that makes its own light and heat. The Sun is the star nearest to us. Other stars look tiny only because they are so far away.',
    'stars twinkle shine',
  ),
  fact(
    'shooting-star',
    'What is a shooting star?',
    'A shooting star is not a star at all. It is a meteor: a small piece of rock or dust from space that burns up as it speeds into Earth\'s air, leaving a bright streak. If a piece survives and lands, it is called a meteorite.',
    'shooting star meteor meteorite meteors falling streak',
  ),
  fact(
    'comet-asteroid',
    'What is the difference between a comet and an asteroid?',
    'An asteroid is a lump of rock or metal that orbits the Sun, mostly between Mars and Jupiter. A comet is made of ice and dust; when it comes near the Sun the ice turns to gas and forms a long glowing tail.',
    'comet comets asteroid asteroids tail belt rock ice',
  ),
  fact(
    'universe-age',
    'How old is the universe?',
    'Scientists have measured that the universe is about 13.8 billion years old. It began with an event called the Big Bang and has been expanding ever since. The Sun and Earth are much younger: about 4.6 billion years old.',
    'old age universe big bang began start earth sun billion years',
  ),
  fact(
    'light-year',
    'What is a light-year?',
    'A light-year is a distance, not a time. It is how far light travels in one year: about 9.5 trillion km. Stars are so far apart that astronomers use light-years to measure the gaps between them.',
    'light year lightyear distance far measure',
  ),
  fact(
    'gravity',
    'What is gravity?',
    'Gravity is the pull that every object has on every other object. Bigger things pull harder, which is why Earth holds you on the ground and keeps the Moon in orbit. Gravity gets weaker with distance but never completely stops.',
    'gravity pull weight heavy fall force',
  ),
  fact(
    'rocket',
    'How do rockets work?',
    'A rocket burns fuel and blasts hot gas out of its engines at very high speed. Pushing the gas one way pushes the rocket the other way. Rockets carry their own oxygen to burn the fuel, so they work even in space where there is no air.',
    'rocket rockets engine fuel launch fly thrust work blast',
  ),
  fact(
    'travel-time',
    'How long does it take to travel to the Moon or Mars?',
    'A trip to the Moon takes about three days. A trip to Mars takes about six to nine months, and can only start when the two planets are lined up well, which happens about every two years.',
    'long take travel trip journey get reach moon mars time days months',
  ),
  fact(
    'nasa',
    'What is NASA?',
    'NASA is the space agency of the United States, founded in 1958. Its name stands for National Aeronautics and Space Administration. NASA sent astronauts to the Moon, helps run the International Space Station, and sends robots and telescopes to explore space.',
    'nasa agency stand stands founded who america united states',
  ),
  fact(
    'artemis',
    'What is the Artemis programme?',
    'Artemis is NASA\'s programme to send astronauts back to the Moon and, in time, to build a lasting base there. What crews learn on the Moon is meant to help prepare for sending people to Mars.',
    'artemis return moon base programme program orion',
  ),
  fact(
    'webb',
    'What is the James Webb Space Telescope?',
    'The James Webb Space Telescope is a very large telescope launched in December 2021. It sits about 1.5 million km from Earth and sees infrared light, which lets it look at very distant galaxies and at the air around planets orbiting other stars.',
    'james webb telescope jwst hubble infrared',
  ),
  fact(
    'satellite',
    'What is a satellite?',
    'A satellite is anything that orbits a planet. The Moon is a natural satellite. People have also launched thousands of machines as satellites, used for weather forecasts, maps, television, the internet and studying the Earth.',
    'satellite satellites orbiting gps weather',
  ),
  fact(
    'astronaut-become',
    'How do you become an astronaut?',
    'Astronauts usually study science, engineering, maths or medicine, or become skilled pilots, and then work for years in those jobs. They must be fit and good at teamwork. After being chosen, they train for about two years before a mission.',
    'become astronaut job career train training how can i study',
  ),
  fact(
    'astronaut-sleep',
    'How do astronauts sleep and use the toilet in space?',
    'Astronauts sleep in sleeping bags fastened to the wall so they do not drift away. Space toilets use flowing air, like a gentle vacuum cleaner, to pull waste away because nothing falls down. The urine is then recycled into clean water.',
    'sleep bed toilet bathroom pee poo poop wee wash shower night',
  ),
  fact(
    'astronaut-exercise',
    'Why do astronauts exercise in space?',
    'Without gravity to work against, muscles and bones grow weaker. Astronauts on the space station exercise for about two hours every day, using a treadmill with straps, an exercise bike and a machine that copies weightlifting.',
    'exercise muscles bones gym fit weak treadmill body',
  ),
  fact(
    'spacewalk',
    'What is a spacewalk?',
    'A spacewalk is when an astronaut puts on a spacesuit and goes outside the spacecraft, usually to repair or build something. Spacewalks often last six to seven hours, and the astronaut stays attached by a safety tether.',
    'spacewalk space walk eva outside tether',
  ),
  fact(
    'iss-size',
    'How big is the International Space Station and who lives there?',
    'The International Space Station is about the size of a football pitch and usually has a crew of about seven. It was built piece by piece in orbit by space agencies from the USA, Russia, Europe, Japan and Canada.',
    'iss international space station big size crew people live many built countries',
  ),
  fact(
    'life',
    'Is there life on other planets?',
    'Nobody has found life beyond Earth so far. Scientists are searching in places that have or once had water, such as Mars and the icy moon Europa, and are studying planets around other stars.',
    'life aliens alien other planets exist europa extraterrestrial',
  ),
  fact(
    'space-weather',
    'What is space weather?',
    'Space weather is what the Sun does to the space around Earth. Solar flares and huge bursts of particles from the Sun can disturb radios, satellites and power grids, raise radiation for astronauts, and light up the sky with auroras.',
    'space weather solar flare flares storm sun aurora',
  ),
];
