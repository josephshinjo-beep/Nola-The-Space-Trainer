import type { ProgressMap } from '../academy/progress';
import { nextModule } from '../academy/progress';
import { CURRICULUM } from '../academy/curriculum';
import { SIM } from '../../simulation/config';
import { currentMission } from '../../simulation/missions';
import type { StationState } from '../../simulation/types';
import type { SearchHit } from './knowledge';
import type { NolaMood } from './NolaMascot';

/**
 * NOLA's built-in brain: answers that need no AI service. It is used when
 * the AI is switched off or unreachable, so the companion always works.
 */

export interface ReplySource {
  label: string;
  /** A page in the app to read more, when there is one. */
  to?: string;
}

export interface Reply {
  text: string;
  mood: NolaMood;
  sources: ReplySource[];
  /** Who wrote the answer, shown to the student for honesty. */
  origin: 'built-in' | 'ai';
  /** Related questions the student can tap when NOLA has no confident answer. */
  suggestions?: string[];
}

/** What NOLA knows about the student's situation. Read-only facts, no personal details. */
export interface CompanionContext {
  modulesCompleted: number;
  nextModuleTitle: string | null;
  missionTitle: string | null;
  nextTask: { label: string; hint: string } | null;
  /** Plain-language station problems, most urgent first. */
  warnings: string[];
  hasStation: boolean;
}

export function buildContext(progress: ProgressMap, station: StationState | null): CompanionContext {
  const upNext = nextModule(progress);
  const mission = station ? currentMission(station) : null;
  const task = mission?.tasks.find((candidate) => !station?.completedTasks.includes(candidate.id)) ?? null;
  const warnings: string[] = [];
  if (station) {
    const unlocked = (system: 'oxygen' | 'water' | 'food' | 'energy' | 'temperature') => station.unlocked.includes(system);
    if (station.storm) warnings.push('A solar storm is in progress: get to the Radiation Shelter.');
    if (unlocked('oxygen') && station.resources.oxygen < 35) warnings.push('Oxygen is low: check the Oxygen Generator and the CO₂ Scrubber.');
    if (unlocked('water') && station.resources.water < 35) warnings.push('Water is low: run the Water Recycler and check for leaks.');
    if (unlocked('food') && station.resources.food < 35) warnings.push('Food is low: plant and harvest crops in the Hydroponics Lab.');
    if (unlocked('energy') && station.resources.energy < 35) warnings.push('Energy is low: check the solar panels or turn on power saver.');
    if (unlocked('temperature') && (station.temperature < SIM.tooCold || station.temperature > SIM.tooHot)) warnings.push('The cabin temperature is out of the safe range: check Thermal Control.');
    if (station.faults.length > 0) warnings.push(`${station.faults.length} station ${station.faults.length === 1 ? 'fault needs' : 'faults need'} repairing. Look for the warning markers.`);
  }
  return {
    modulesCompleted: CURRICULUM.filter((module) => progress[module.id]?.completed).length,
    nextModuleTitle: upNext?.title ?? null,
    missionTitle: mission?.title ?? null,
    nextTask: task ? { label: task.label, hint: task.hint } : null,
    warnings,
    hasStation: station !== null,
  };
}

/** The same context as a short paragraph, for the AI to read. */
export function describeContext(context: CompanionContext): string {
  const lines = [`Academy modules completed: ${context.modulesCompleted} of ${CURRICULUM.length}.`];
  lines.push(context.nextModuleTitle ? `Next Academy module: ${context.nextModuleTitle}.` : 'All Academy modules are complete.');
  if (context.missionTitle && context.nextTask) lines.push(`Current station mission: ${context.missionTitle}. Next task: ${context.nextTask.label} (${context.nextTask.hint}).`);
  else if (context.hasStation) lines.push('No station mission is waiting right now.');
  else lines.push('The student has not started the station game yet.');
  if (context.warnings.length > 0) lines.push(`Station problems: ${context.warnings.join(' ')}`);
  return lines.join(' ');
}

/** The one reply to anything that is not about space, NASA, the lessons or the app. Keep in step with api/chat.ts. */
export const OFF_TOPIC_REPLY =
  "I can only help with space! Please ask me a question about space, NASA, your NOLA Academy lessons, or how to use this app and your station.";

export const SUGGESTED_QUESTIONS = [
  'Why do astronauts float?',
  'How do astronauts get oxygen?',
  'How is water recycled in space?',
  'What is hydroponics?',
  'What should I do next?',
  'How long does a message take to reach Mars?',
];

const PERSONAL_INFO = /\b(my (home )?address|my phone|my password|my school is|my real name|my full name|my email|i live (at|in|on)\b)|\b\d{7,}\b|[\w.+-]+@[\w-]+\.[a-z]{2,}/i;
const GREETING = /^(hi|hello|hey|hiya|howdy|yo|good (morning|afternoon|evening))\b/i;
const THANKS = /\b(thanks|thank you|thx|cheers)\b/i;
const GOODBYE = /^(bye|goodbye|see you|good night)\b/i;
const WHO = /\b(who|what) are you\b|\byour name\b|\bare you (a |an )?(robot|real|human|ai)\b/i;
const HELP = /^(help|\?)$|\bwhat can (i|you) (ask|do)\b|\bwhat do you know\b/i;
const HINT = /\b(hint|stuck|what (should|do) i do|what next|what now|next step|what is my (mission|task))\b/i;
const STATUS = /\bhow is my (station|crew)\b|\bmy station\b.*\b(doing|ok|okay|status)\b|\bstation status\b/i;

function hintReply(context: CompanionContext): string {
  if (context.warnings.length > 0) return `Here's what needs you most: ${context.warnings[0]}`;
  if (context.nextTask) return `Your mission is "${context.missionTitle}". Next: ${context.nextTask.label}. Where: ${context.nextTask.hint}.`;
  if (!context.hasStation && context.modulesCompleted > 0) return 'Your station is unlocked and waiting. Open NOLA Mission to board it and get your first mission!';
  if (context.nextModuleTitle) return `Your next step is in the Academy: ${context.nextModuleTitle}. Passing it unlocks a new part of your station!`;
  return 'You have finished every module and mission. Keep your station running, commander, or revisit any lesson you like.';
}

/** Chooses NOLA's built-in reply to a message. */
export function builtInReply(message: string, hits: readonly SearchHit[], context: CompanionContext, suggestions: readonly string[] = []): Reply {
  const text = message.trim();
  const reply = (words: string, mood: NolaMood = 'happy', sources: ReplySource[] = []): Reply => ({ text: words, mood, sources, origin: 'built-in' });

  if (PERSONAL_INFO.test(text)) {
    return reply("Quick safety tip from your robot friend: please don't share personal details like your address, school, phone number or passwords online, not even with me. Now, what would you like to know about space?", 'curious');
  }
  if (WHO.test(text)) return reply("I'm NOLA, a training robot! I'm not a person. My job is to help you learn how humans survive in space and to guide you on your station.");
  if (HINT.test(text)) return reply(hintReply(context), 'thinking', [context.nextTask || context.warnings.length ? { label: 'NOLA Mission', to: '/mission' } : { label: 'NOLA Academy', to: '/academy' }]);
  if (STATUS.test(text)) {
    if (!context.hasStation) return reply("You haven't boarded your station yet. Pass Module 1 in the Academy and I'll open the airlock!", 'curious', [{ label: 'NOLA Academy', to: '/academy' }]);
    return reply(context.warnings.length > 0 ? `Your station needs some attention. ${context.warnings.join(' ')}` : 'Your station is in good shape. Nothing needs fixing right now. Nice work!', context.warnings.length > 0 ? 'curious' : 'excited', [{ label: 'NOLA Mission', to: '/mission' }]);
  }
  if (HELP.test(text)) return reply(`You can ask me about space, oxygen, water, food, energy, radiation, temperature, communication, or how the app works. Try: "${SUGGESTED_QUESTIONS[0]}"`);
  if (GOODBYE.test(text)) return reply('See you soon, cadet! Your station will be right where you left it.', 'happy');

  const best = hits[0];
  if (best) return reply(best.passage.text, 'happy', [best.passage.source]);

  if (GREETING.test(text)) return reply("Hello, cadet! I'm NOLA. Ask me anything about living in space, or say \"What should I do next?\" for a hint.", 'excited');
  if (THANKS.test(text)) return reply("You're welcome! Asking questions is exactly what good astronauts do.", 'excited');

  // Something related is in the notes, but nothing answers this exactly: offer the nearest questions.
  if (suggestions.length > 0) {
    return { ...reply("I don't have a good answer for that in my notes yet. Were you asking about one of these?", 'thinking'), suggestions: [...suggestions] };
  }
  return reply(OFF_TOPIC_REPLY, 'thinking');
}
