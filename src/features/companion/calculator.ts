import { SOL_CONFIG } from '../../sol/config';

/**
 * NOLA's calculator. Answers maths questions exactly, in the browser, before
 * any AI is asked: AI models can get arithmetic wrong, and these answers
 * must be right. Every answer shows its working so children can follow it.
 *
 * There is no eval() here: plain sums go through a small, strict parser
 * that understands only numbers, + - × ÷ ^ and brackets.
 */

export interface CalcAnswer {
  text: string;
  /** Where the real-world numbers come from, when any are used. */
  source?: string;
}

// ---------------------------------------------------------------- real-world numbers

/** Speed of light in km per second (exact: 299,792,458 m/s). */
const LIGHT_KM_S = 299_792.458;

/** Distances from Earth in km. Planets move, so some are ranges (closest to farthest). */
const DISTANCES: Record<string, { name: string; km: number | [number, number] }> = {
  moon: { name: 'the Moon', km: 384_400 },
  sun: { name: 'the Sun', km: 149_600_000 },
  mars: { name: 'Mars', km: [54_600_000, 401_000_000] },
  venus: { name: 'Venus', km: [38_000_000, 261_000_000] },
  jupiter: { name: 'Jupiter', km: [588_000_000, 968_000_000] },
  iss: { name: 'the International Space Station', km: 400 },
  'space station': { name: 'the International Space Station', km: 400 },
};

/** Surface gravity compared with Earth (NASA Planetary Fact Sheet). */
const GRAVITY: Record<string, { name: string; g: number }> = {
  mercury: { name: 'Mercury', g: 0.378 },
  venus: { name: 'Venus', g: 0.907 },
  moon: { name: 'the Moon', g: 0.166 },
  mars: { name: 'Mars', g: 0.377 },
  jupiter: { name: 'Jupiter', g: 2.36 },
  saturn: { name: 'Saturn', g: 0.916 },
  uranus: { name: 'Uranus', g: 0.889 },
  neptune: { name: 'Neptune', g: 1.12 },
  pluto: { name: 'Pluto', g: 0.063 },
  sun: { name: 'the Sun', g: 28 },
};

/** Length of one year on each planet, in Earth years (NASA Planetary Fact Sheet). */
const YEAR_LENGTH: Record<string, { name: string; years: number }> = {
  mercury: { name: 'Mercury', years: 0.241 },
  venus: { name: 'Venus', years: 0.615 },
  mars: { name: 'Mars', years: 1.881 },
  jupiter: { name: 'Jupiter', years: 11.86 },
  saturn: { name: 'Saturn', years: 29.46 },
  uranus: { name: 'Uranus', years: 84.01 },
  neptune: { name: 'Neptune', years: 164.8 },
};

const SOL_SECONDS = SOL_CONFIG.time.solLengthSeconds.value;
const DAY_SECONDS = 86_400;

// ---------------------------------------------------------------- formatting

const NUMBER = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
const fmt = (value: number) => NUMBER.format(Math.abs(value) < 0.005 && value !== 0 ? Number(value.toPrecision(2)) : value);

/** "1.3 seconds", "12 minutes and 30 seconds", "about 6 days". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${fmt(seconds)} seconds`;
  const minutes = seconds / 60;
  if (minutes < 60) {
    const whole = Math.floor(minutes);
    const rest = Math.round(seconds - whole * 60);
    return rest > 0 ? `${whole} minute${whole === 1 ? '' : 's'} and ${rest} second${rest === 1 ? '' : 's'}` : `${whole} minute${whole === 1 ? '' : 's'}`;
  }
  const hours = minutes / 60;
  if (hours < 48) return `about ${fmt(Math.round(hours * 10) / 10)} hours`;
  const days = hours / 24;
  if (days < 730) return `about ${fmt(Math.round(days))} days`;
  return `about ${fmt(Math.round((days / 365.25) * 10) / 10)} years`;
}

// ---------------------------------------------------------------- reading numbers in words

const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};

/** "12", "1,000", "2.5" or a number word like "four". */
const NUM = String.raw`(\d[\d,]*(?:\.\d+)?|${Object.keys(WORD_NUMBERS).filter((w) => w.length > 2).join('|')})`;
const toNumber = (raw: string) => (raw in WORD_NUMBERS ? WORD_NUMBERS[raw]! : Number(raw.replace(/,/g, '')));

// ---------------------------------------------------------------- safe arithmetic

/** Turns friendly symbols into plain ones: × ÷ x "times", "plus" and so on. */
function normaliseSum(text: string): string {
  return text
    .toLowerCase()
    .replace(/[×✕]/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\bmultiplied by\b|\btimes\b/g, '*')
    .replace(/\bdivided by\b|\bover\b/g, '/')
    .replace(/\bplus\b|\badd\b/g, '+')
    .replace(/\bminus\b|\btake away\b/g, '-')
    .replace(/\bto the power of\b/g, '^')
    .replace(/\bsquared\b/g, '^2')
    .replace(/(\d)\s*x\s*(?=[\d(])/g, '$1*')
    .replace(/(\d),(?=\d{3}\b)/g, '$1');
}

/**
 * Works out a plain sum such as "(3 + 5) * 2" or "2^10". Returns null when
 * the text is not a sum. Only numbers, + - * / ^ and brackets are allowed.
 */
export function evaluateExpression(input: string): number | null {
  const text = normaliseSum(input).replace(/\s+/g, '');
  if (!text || text.length > 80 || !/^[\d.+\-*/^()]+$/.test(text) || !/\d/.test(text)) return null;
  let pos = 0;
  let depth = 0;
  const peek = () => text[pos];
  const fail = (): never => {
    throw new Error('bad sum');
  };

  function number(): number {
    const match = /^\d+(\.\d+)?|^\.\d+/.exec(text.slice(pos));
    if (!match) return fail();
    pos += match[0].length;
    return Number(match[0]);
  }
  function factor(): number {
    if (peek() === '-') {
      pos++;
      return -factor();
    }
    if (peek() === '+') {
      pos++;
      return factor();
    }
    if (peek() === '(') {
      pos++;
      if (++depth > 20) fail();
      const value = sum();
      if (peek() !== ')') fail();
      pos++;
      depth--;
      return value;
    }
    return number();
  }
  function power(): number {
    const base = factor();
    if (peek() === '^') {
      pos++;
      const exponent = power();
      if (Math.abs(exponent) > 1000) fail();
      return base ** exponent;
    }
    return base;
  }
  function product(): number {
    let value = power();
    while (peek() === '*' || peek() === '/') {
      const op = text[pos++];
      const right = power();
      value = op === '*' ? value * right : value / right;
    }
    return value;
  }
  function sum(): number {
    let value = product();
    while (peek() === '+' || peek() === '-') {
      const op = text[pos++];
      const right = product();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  }

  try {
    const value = sum();
    if (pos !== text.length) return null;
    // A lone number is not a sum to answer.
    if (/^[\d.]+$/.test(text)) return null;
    return value;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- space calculators

const placeIn = (text: string, table: Record<string, unknown>) => Object.keys(table).find((key) => new RegExp(`\\b${key}\\b`).test(text));

function lifeSupport(text: string): CalcAnswer | null {
  const supply = /\b(oxygen|air|water|food)\b/.exec(text)?.[1];
  if (!supply || !/\b(need|needs|use|uses|eat|eats|drink|drinks|breathe|breathes|how much)\b/.test(text)) return null;
  const crewMatch = new RegExp(`${NUM}\\s+(?:astronauts?|people|persons?|crew|crew members?)`).exec(text);
  // "a week" counts as one week.
  const timeMatch = new RegExp(`(${NUM.slice(1, -1)}|an?)\\s+(days?|sols?|weeks?|months?|years?)`).exec(text);
  if (!timeMatch) return null;
  const crew = crewMatch ? toNumber(crewMatch[1]!) : 1;
  const amount = toNumber(timeMatch[1]!);
  const unit = timeMatch[2]!.replace(/s$/, '');
  const days = amount * ({ day: 1, sol: SOL_SECONDS / DAY_SECONDS, week: 7, month: 30, year: 365 } as Record<string, number>)[unit]!;
  if (!(crew > 0) || !(days > 0) || crew > 1e6 || days > 1e6) return null;

  const key = supply === 'air' ? 'oxygen' : (supply as 'oxygen' | 'water' | 'food');
  const perDay = { oxygen: SOL_CONFIG.crew.oxygenPerPersonPerSol.value, water: SOL_CONFIG.crew.waterPerPersonPerSol.value, food: SOL_CONFIG.crew.foodPerPersonPerSol.value }[key];
  const what = { oxygen: 'of oxygen', water: 'of drinking water', food: 'of food' }[key];
  const total = crew * perDay * days;
  const dayWords = unit === 'day' ? `${fmt(amount)} day${amount === 1 ? '' : 's'}` : `${fmt(amount)} ${unit}${amount === 1 ? '' : 's'} (about ${fmt(days)} Earth days)`;
  return {
    text: `${fmt(crew)} ${crew === 1 ? 'astronaut' : 'astronauts'} × ${perDay} kg a day × ${dayWords} = ${fmt(total)} kg ${what}. Each astronaut needs about ${perDay} kg ${what} every day.`,
    source: 'NASA Baseline Values and Assumptions Document (BVAD)',
  };
}

function lightDelay(text: string): CalcAnswer | null {
  if (!/\b(light|sunlight|signal|message|radio|call|email|text)\b/.test(text) || !/\b(take|takes|long|delay|travel|get|reach)\b/.test(text)) return null;
  const kmMatch = new RegExp(`${NUM}\\s*(?:km|kilometres|kilometers)`).exec(text);
  if (kmMatch) {
    const km = toNumber(kmMatch[1]!);
    if (!(km > 0)) return null;
    return { text: `${fmt(km)} km ÷ ${fmt(LIGHT_KM_S)} km per second = ${formatDuration(km / LIGHT_KM_S)}. Light and radio waves travel at about 300,000 km every second.` };
  }
  const place = placeIn(text, DISTANCES);
  if (!place) return null;
  const { name, km } = DISTANCES[place]!;
  if (Array.isArray(km)) {
    return {
      text: `${name} is between ${fmt(km[0] / 1e6)} and ${fmt(km[1] / 1e6)} million km away, because it moves around the Sun. A message takes between ${formatDuration(km[0] / LIGHT_KM_S)} and ${formatDuration(km[1] / LIGHT_KM_S)} to get there.`,
      source: 'NASA',
    };
  }
  return { text: `${fmt(km)} km ÷ ${fmt(LIGHT_KM_S)} km per second = ${formatDuration(km / LIGHT_KM_S)} for light or a radio message to reach ${name}.`, source: 'NASA' };
}

function weightElsewhere(text: string): CalcAnswer | null {
  if (!/\bweigh/.test(text)) return null;
  const place = placeIn(text, GRAVITY);
  if (!place) return null;
  const { name, g } = GRAVITY[place]!;
  const massMatch = new RegExp(`${NUM}\\s*(kg|kilos?|kilograms?|pounds?|lbs?)`).exec(text);
  if (!massMatch) {
    return { text: `Gravity on ${name} is ${fmt(g)} times Earth's. Tell me your weight, for example "I weigh 35 kg, what would I weigh on ${name}?", and I will work it out.`, source: 'NASA Planetary Fact Sheet' };
  }
  const mass = toNumber(massMatch[1]!);
  const unit = /^p|^lb/.test(massMatch[2]!) ? 'pounds' : 'kg';
  return {
    text: `${fmt(mass)} ${unit} × ${fmt(g)} = ${fmt(mass * g)} ${unit}. On ${name} a scale would show about ${fmt(mass * g)} ${unit}, because gravity there is ${fmt(g)} times Earth's. Your body would still be made of exactly the same amount of you!`,
    source: 'NASA Planetary Fact Sheet',
  };
}

function ageElsewhere(text: string): CalcAnswer | null {
  if (!/\b(old|age|birthday|years? old)\b/.test(text)) return null;
  const place = placeIn(text, YEAR_LENGTH);
  if (!place) return null;
  const { name, years } = YEAR_LENGTH[place]!;
  const ageMatch = new RegExp(`(?:i am|i'm|im|age)\\s+${NUM}|${NUM}\\s+years? old`).exec(text);
  const age = ageMatch ? toNumber((ageMatch[1] ?? ageMatch[2])!) : null;
  if (age === null) {
    return { text: `One year on ${name} lasts ${fmt(years)} Earth years. Tell me your age, for example "I am 10, how old would I be on ${name}?", and I will work it out.`, source: 'NASA Planetary Fact Sheet' };
  }
  return {
    text: `${fmt(age)} ÷ ${fmt(years)} = ${fmt(age / years)}. You would be about ${fmt(age / years)} ${name} years old, because one year on ${name} lasts ${fmt(years)} Earth years.`,
    source: 'NASA Planetary Fact Sheet',
  };
}

function travelTime(text: string): CalcAnswer | null {
  if (!/\b(drive|driving|fly|flying|travel|walk|walking|cycle|cycling|bike)\b/.test(text) || !/\b(how long|time)\b/.test(text)) return null;
  const place = placeIn(text, DISTANCES);
  if (!place) return null;
  const { name, km } = DISTANCES[place]!;
  const distance = Array.isArray(km) ? km[0] : km;
  const speedMatch = new RegExp(`${NUM}\\s*(?:km/h|kph|km an hour|kilometres an hour|kilometers an hour)`).exec(text);
  const [speed, how] = speedMatch
    ? [toNumber(speedMatch[1]!), `at ${fmt(toNumber(speedMatch[1]!))} km per hour`]
    : /\b(walk|walking)\b/.test(text)
      ? [5, 'walking at 5 km per hour']
      : /\b(cycle|cycling|bike)\b/.test(text)
        ? [20, 'cycling at 20 km per hour']
        : /\b(fly|flying)\b/.test(text)
          ? [900, 'in a passenger plane at 900 km per hour']
          : [100, 'in a car at 100 km per hour'];
  if (!(speed > 0)) return null;
  const hours = distance / speed;
  const rangeNote = Array.isArray(km) ? ` (that is when ${name} is closest)` : '';
  return { text: `${fmt(distance)} km ÷ ${fmt(speed)} km per hour = ${fmt(Math.round(hours))} hours. That is ${formatDuration(hours * 3600)} ${how}${rangeNote}, without stopping!`, source: 'NASA' };
}

function solConversion(text: string): CalcAnswer | null {
  if (!/\bsols?\b/.test(text)) return null;
  const toSols = new RegExp(`${NUM}\\s+(?:earth\\s+)?days?\\b.*\\bsols?\\b|\\bsols?\\b.*\\b${NUM}\\s+(?:earth\\s+)?days?\\b`).exec(text);
  if (toSols) {
    const days = toNumber((toSols[1] ?? toSols[2])!);
    return { text: `${fmt(days)} Earth days × 24 hours ÷ 24.66 hours = ${fmt((days * DAY_SECONDS) / SOL_SECONDS)} sols. A sol (one Mars day) is 24 hours, 39 minutes and 35 seconds long.`, source: 'NASA Mars Fact Sheet' };
  }
  const fromSols = new RegExp(`${NUM}\\s+sols?`).exec(text);
  if (fromSols) {
    const sols = toNumber(fromSols[1]!);
    return { text: `${fmt(sols)} sols × 24.66 hours = ${fmt((sols * SOL_SECONDS) / 3600)} hours, or ${fmt((sols * SOL_SECONDS) / DAY_SECONDS)} Earth days. A sol is 24 hours, 39 minutes and 35 seconds long.`, source: 'NASA Mars Fact Sheet' };
  }
  if (/how long|what is a sol|length/.test(text)) return { text: 'A sol is one day on Mars: 24 hours, 39 minutes and 35 seconds. That is about 40 minutes longer than a day on Earth.', source: 'NASA Mars Fact Sheet' };
  return null;
}

/** Strips a question down to the sum inside it: "what is 12 x 7?" becomes "12 x 7". */
function sumInside(text: string): string {
  return text
    .replace(/^(please\s+)?(can you\s+)?(what is|what's|whats|calculate|work out|solve|compute|how much is)\s+/, '')
    .replace(/[?=!]+\s*$/, '')
    .trim();
}

/**
 * Answers a calculation question, or returns null if the message is not one.
 * Space calculators are tried first, then plain sums.
 */
export function calculate(message: string): CalcAnswer | null {
  const text = message.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
  if (!text || text.length > 200) return null;
  for (const calculator of [lifeSupport, lightDelay, weightElsewhere, ageElsewhere, travelTime, solConversion]) {
    const answer = calculator(text);
    if (answer) return answer;
  }
  const sum = sumInside(text);
  const value = evaluateExpression(sum);
  if (value === null) return null;
  if (!Number.isFinite(value)) return { text: sum.includes('/0') || /\/\s*0(?!\.)/.test(sum) ? "You can't divide by zero. Nobody can, not even a robot!" : 'That number is too big for me to show.' };
  return { text: `${normaliseSum(sum).replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/\s+/g, ' ').trim()} = ${fmt(value)}` };
}
