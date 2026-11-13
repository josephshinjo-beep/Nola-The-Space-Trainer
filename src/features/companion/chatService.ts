import type { SearchHit } from './knowledge';
import { builtInReply, describeContext, type CompanionContext, type Reply } from './responder';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface AskOptions {
  message: string;
  history: ChatTurn[];
  hits: SearchHit[];
  context: CompanionContext;
  /** Gets the student's current login token, which proves to the server who is asking. */
  getToken: () => Promise<string | null>;
}

/**
 * Whether the AI backend exists. Unknown until the first try. If the
 * server says the AI is not set up, we stop asking for the rest of the visit.
 */
let aiAvailable: boolean | null = null;

/** Messages the built-in brain always handles itself, for safety and for accurate game facts. */
const KEEP_LOCAL = /\b(hint|stuck|what (should|do) i do|what next|what now|next step|how is my (station|crew)|station status)\b|\b\d{7,}\b|[\w.+-]+@[\w-]+\.[a-z]{2,}|\bmy (home )?address\b|\bmy password\b|\bmy phone\b/i;

/**
 * Gets NOLA's reply. Tries the AI backend first and falls back to the
 * built-in answers if the AI is off, slow, fails or declines.
 *
 * The AI receives only text (the question, recent chat, lesson passages
 * and a short situation summary) and returns only text. There is no path
 * from here to the simulation.
 */
export async function askNola({ message, history, hits, context, getToken }: AskOptions): Promise<Reply> {
  const fallback = builtInReply(message, hits, context);
  if (aiAvailable === false || KEEP_LOCAL.test(message)) return fallback;

  try {
    const token = await getToken();
    if (!token) return fallback;
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        message,
        history: history.slice(-8),
        passages: hits.map((hit) => ({ title: hit.passage.title, text: hit.passage.text })),
        context: describeContext(context),
      }),
      signal: AbortSignal.timeout(28_000),
    });

    const isJson = response.headers.get('content-type')?.includes('application/json') ?? false;
    // No backend here (for example plain local development), or the AI key is not set.
    if (!isJson || response.status === 404 || response.status === 503) {
      aiAvailable = false;
      return fallback;
    }
    if (!response.ok) return fallback;

    const data = (await response.json()) as { answer?: unknown };
    if (typeof data.answer !== 'string' || !data.answer.trim()) return fallback;
    aiAvailable = true;
    return { text: data.answer.trim(), mood: 'happy', sources: hits.slice(0, 2).map((hit) => hit.passage.source), origin: 'ai' };
  } catch (error) {
    console.warn('AI chat unavailable, using built-in answers.', error);
    return fallback;
  }
}

/** For tests. */
export function resetAiAvailability(): void {
  aiAvailable = null;
}
