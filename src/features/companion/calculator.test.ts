import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculate, evaluateExpression, formatDuration } from './calculator';
import { askNola, resetAiAvailability } from './chatService';
import type { CompanionContext } from './responder';

const answer = (question: string) => calculate(question)?.text ?? null;

describe('plain sums', () => {
  it('follows the normal order of operations', () => {
    expect(evaluateExpression('2 + 3 * 4')).toBe(14);
    expect(evaluateExpression('(2 + 3) * 4')).toBe(20);
    expect(evaluateExpression('2^10')).toBe(1024);
    expect(evaluateExpression('2^3^2')).toBe(512);
    expect(evaluateExpression('-5 + 2')).toBe(-3);
    expect(evaluateExpression('10 / 4')).toBe(2.5);
    expect(evaluateExpression('0.5 * .5')).toBe(0.25);
  });

  it('understands the symbols and words children use', () => {
    expect(evaluateExpression('12 × 7')).toBe(84);
    expect(evaluateExpression('12 x 7')).toBe(84);
    expect(evaluateExpression('100 ÷ 4')).toBe(25);
    expect(evaluateExpression('6 times 7')).toBe(42);
    expect(evaluateExpression('9 plus 10 minus 2')).toBe(17);
    expect(evaluateExpression('20 divided by 5')).toBe(4);
    expect(evaluateExpression('5 squared')).toBe(25);
    expect(evaluateExpression('1,000 * 3')).toBe(3000);
  });

  it('answers sums asked as questions, and shows the working', () => {
    expect(answer('What is 12 x 7?')).toBe('12 × 7 = 84');
    expect(answer('calculate (3 + 5) / 2')).toBe('(3 + 5) ÷ 2 = 4');
    expect(answer('how much is 0.84 * 4 * 30')).toBe('0.84 × 4 × 30 = 100.8');
    expect(answer('10/3')).toBe('10 ÷ 3 = 3.33');
  });

  it('explains dividing by zero instead of crashing', () => {
    expect(answer('what is 5 / 0')).toMatch(/can't divide by zero/);
  });

  it('refuses anything that is not a plain sum, so it can never run code', () => {
    for (const bad of ['alert(1)', '2 + ', '(1 + 2', 'process.exit()', '1 + 2; drop', 'Math.max(1,2)', '((((((((((((((((((((((1))))))))))))))))))))))', '2^99999', '42', '']) {
      expect(evaluateExpression(bad), bad).toBeNull();
    }
    expect(evaluateExpression('1+'.repeat(60) + '1')).toBeNull();
  });

  it('ignores ordinary questions with no sum in them', () => {
    for (const question of ['Why do astronauts float?', 'What is hydroponics?', 'hello', 'Who was the first person on the Moon?', 'what should I do next?']) {
      expect(calculate(question), question).toBeNull();
    }
  });
});

describe('space calculators', () => {
  it('works out crew supplies from NASA values', () => {
    expect(answer('How much oxygen do 4 astronauts need for 30 days?')).toBe('4 astronauts × 0.84 kg a day × 30 days = 100.8 kg of oxygen. Each astronaut needs about 0.84 kg of oxygen every day.');
    expect(answer('how much water does one astronaut drink in a week')).toMatch(/^1 astronaut × 2.5 kg a day × 1 week \(about 7 Earth days\) = 17.5 kg of drinking water/);
    expect(answer('how much food do six people eat in 2 months')).toMatch(/6 astronauts × 1.8 kg a day × 2 months \(about 60 Earth days\) = 648 kg of food/);
    expect(answer('how much air do three crew need for 10 sols')).toMatch(/3 astronauts × 0.84 kg a day × 10 sols \(about 10.27 Earth days\) = 25.89 kg of oxygen/);
    expect(calculate('How much oxygen do 4 astronauts need for 30 days?')?.source).toMatch(/NASA/);
  });

  it('times light and radio messages using the speed of light', () => {
    expect(answer('How long does light take to reach the Moon?')).toMatch(/= 1.28 seconds/);
    expect(answer('how long does a message take to reach Mars')).toMatch(/between 3 minutes and 2 seconds and 22 minutes and 18 seconds/);
    expect(answer('how long does sunlight take to get here from the sun')).toMatch(/= 8 minutes and 19 seconds/);
    expect(answer('how long would a signal take to travel 1,000,000 km')).toMatch(/= 3.34 seconds/);
  });

  it('works out weight on other worlds', () => {
    expect(answer('I weigh 35 kg. What would I weigh on Mars?')).toMatch(/^35 kg × 0.38 = 13.2 kg/);
    expect(answer('how much would i weigh on the moon if i weigh 40 kg')).toMatch(/40 kg × 0.17 = 6.64 kg/);
    expect(answer('what would I weigh on Jupiter')).toMatch(/Gravity on Jupiter is 2.36 times Earth's. Tell me your weight/);
  });

  it('works out age on other planets', () => {
    expect(answer('I am 10. How old would I be on Mars?')).toMatch(/^10 ÷ 1.88 = 5.32\. You would be about 5.32 Mars years old/);
    expect(answer("how old am i on mercury if i'm 12")).toMatch(/12 ÷ 0.24 = 49.79/);
    expect(answer('how old would I be on Saturn?')).toMatch(/One year on Saturn lasts 29.46 Earth years. Tell me your age/);
  });

  it('works out travel times', () => {
    expect(answer('how long would it take to drive to the moon')).toMatch(/384,400 km ÷ 100 km per hour = 3,844 hours\. That is about 160 days in a car/);
    expect(answer('how long to fly to the moon at 1000 km/h')).toMatch(/÷ 1,000 km per hour = 384 hours/);
    expect(answer('how long would it take to walk to the space station')).toMatch(/400 km ÷ 5 km per hour = 80 hours/);
    expect(answer('how long would it take to drive to mars')).toMatch(/when Mars is closest/);
  });

  it('converts between sols and Earth days', () => {
    expect(answer('how many hours is 10 sols')).toMatch(/10 sols × 24.66 hours = 246.6 hours, or 10.27 Earth days/);
    expect(answer('how many sols are in 100 days')).toMatch(/= 97.32 sols/);
    expect(answer('how long is a sol')).toMatch(/24 hours, 39 minutes and 35 seconds/);
  });

  it('formats durations in words children understand', () => {
    expect(formatDuration(1.28)).toBe('1.28 seconds');
    expect(formatDuration(90)).toBe('1 minute and 30 seconds');
    expect(formatDuration(120)).toBe('2 minutes');
    expect(formatDuration(5 * 3600)).toBe('about 5 hours');
    expect(formatDuration(10 * 86400)).toBe('about 10 days');
    expect(formatDuration(3 * 365.25 * 86400)).toBe('about 3 years');
  });
});

describe('in the chat', () => {
  const context: CompanionContext = { modulesCompleted: 0, nextModuleTitle: null, missionTitle: null, nextTask: null, warnings: [], hasStation: false };
  afterEach(() => {
    vi.unstubAllGlobals();
    resetAiAvailability();
  });

  it('answers maths with the calculator and never sends it to the AI', async () => {
    const fetchMock = vi.fn(async () => Response.json({ answer: 'A guess from the AI.' }));
    vi.stubGlobal('fetch', fetchMock);
    const reply = await askNola({ message: 'How much oxygen do 4 astronauts need for 30 days?', history: [], hits: [], context, getToken: async () => 'token' });
    expect(reply).toMatchObject({ origin: 'calculator', text: expect.stringMatching(/100.8 kg/), sources: [{ label: expect.stringMatching(/NASA/) }] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still sends ordinary questions to the AI', async () => {
    const fetchMock = vi.fn(async () => Response.json({ answer: 'Because the station is falling around Earth.' }));
    vi.stubGlobal('fetch', fetchMock);
    const reply = await askNola({ message: 'Why do astronauts float?', history: [], hits: [], context, getToken: async () => 'token' });
    expect(reply.origin).toBe('ai');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
