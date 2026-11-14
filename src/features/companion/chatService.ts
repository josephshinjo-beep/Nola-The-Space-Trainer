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
  /** Nearby questions to offer when there is no confident built-in answer. */
  suggestions?: string[];
  context: CompanionContext;
  /** Gets the student's current login token, which proves to the server who is asking. */
  getToken: () => Promise<string | null>;
}

/**
 * Whether the AI backend exists. Unknown until the first try. If the
 * server says the AI is not set up, we stop asking for the rest of the visit.
 */
let aiAvailable: boolean | null = null;

/** Whether NOLA's last answer came from the AI, and if not, why. Shown under the chat. */
export type AiStatus =
  | { state: 'unknown' }
  | { state: 'connected'; model?: string; provider?: string }
  | { state: 'off'; reason: string }
  /** The key is set up, but the last question could not be answered by the AI. */
  | { state: 'trouble'; reason: string };

let aiStatus: AiStatus = { state: 'unknown' };
export const getAiStatus = (): AiStatus => aiStatus;

const REASONS: Record<string, string> = {
  missing_key: 'the server has no OPENROUTER_API_KEY (or GEMINI_API_KEY)',
  missing_project_id: 'the server has no FIREBASE_PROJECT_ID',
  key_rejected: 'the AI service rejected the API key',
  key_not_allowed: 'the AI service will not let this key use the model',
  model_not_found: 'none of the AI models could be found',
  rate_limited: 'the free AI models are busy or rate-limited for the moment',
  free_daily_limit: "today's free OpenRouter limit has been reached (it resets each day)",
  privacy_settings: 'OpenRouter is blocking free models because of your account privacy settings. Allow free models at openrouter.ai/settings/privacy',
  no_credits: 'the OpenRouter account has a negative balance',
  ai_busy: 'the AI service is overloaded right now',
  ai_rejected_request: 'the AI service rejected the request',
  timeout: 'the AI took too long to answer',
};

async function explain(response: Response, isJson: boolean): Promise<string> {
  if (!isJson) return 'there is no AI server at this address';
  try {
    const body = (await response.clone().json()) as { error?: string; detail?: string; message?: string };
    const known = body.detail ? REASONS[body.detail] : undefined;
    // The service's own explanation is the most useful thing to show when there is one.
    if (known) return body.message ? `${known}. The service said: "${body.message}"` : known;
    if (body.message) return `${body.detail ?? 'error'}: "${body.message}"`;
    if (body.error === 'not_signed_in') return 'the server could not verify your login';
    if (body.error === 'slow_down') return 'too many questions in a short time';
    return `the AI server answered with an error (${body.detail ?? body.error ?? response.status})`;
  } catch {
    return `the AI server answered with status ${response.status}`;
  }
}

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
export async function askNola({ message, history, hits, suggestions = [], context, getToken }: AskOptions): Promise<Reply> {
  const fallback = builtInReply(message, hits, context, suggestions);
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
      signal: AbortSignal.timeout(26_000),
    });

    const isJson = response.headers.get('content-type')?.includes('application/json') ?? false;
    // No backend here (for example plain local development), or the AI key is not set.
    if (!isJson || response.status === 404 || response.status === 503) {
      aiAvailable = false;
      aiStatus = { state: 'off', reason: await explain(response, isJson) };
      return fallback;
    }
    if (!response.ok) {
      // A one-off failure (busy, slow, quota): say so, and try the AI again next time.
      aiStatus = { state: 'trouble', reason: await explain(response, isJson) };
      return fallback;
    }

    const data = (await response.json()) as { answer?: unknown; offTopic?: unknown; provider?: unknown; model?: unknown };
    aiAvailable = true;
    aiStatus = {
      state: 'connected',
      model: typeof data.model === 'string' ? data.model : undefined,
      provider: data.provider === 'openrouter' ? 'OpenRouter' : data.provider === 'gemini' ? 'Gemini' : undefined,
    };
    // Connected, but the AI declined this one question: use the built-in answer.
    if (typeof data.answer !== 'string' || !data.answer.trim()) return fallback;
    if (data.offTopic === true) return { text: data.answer.trim(), mood: 'thinking', sources: [], origin: 'ai' };
    return { text: data.answer.trim(), mood: 'happy', sources: hits.slice(0, 1).map((hit) => hit.passage.source), origin: 'ai' };
  } catch (error) {
    console.warn('AI chat unavailable, using built-in answers.', error);
    aiStatus = { state: 'trouble', reason: 'the AI server did not answer in time' };
    return fallback;
  }
}

interface SetupReport {
  ready?: boolean;
  provider?: string;
  aiKey?: string;
  keyAccepted?: boolean;
  firebaseProjectId?: string;
  modelThatWillBeUsed?: string;
  problem?: string;
}

/**
 * Asks the server whether the AI key is set up and working, so the chat
 * page can say so before the student types anything. It calls the
 * server's free set-up check, never the AI model itself.
 */
export async function checkAiSetup(): Promise<AiStatus> {
  try {
    const response = await fetch('/api/chat', { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
    const isJson = response.headers.get('content-type')?.includes('application/json') ?? false;
    if (!isJson || !response.ok) {
      aiAvailable = false;
      aiStatus = { state: 'off', reason: 'there is no AI server at this address' };
      return aiStatus;
    }
    const report = (await response.json()) as SetupReport;
    if (report.ready) {
      aiStatus = { state: 'connected', model: report.modelThatWillBeUsed, provider: report.provider };
      return aiStatus;
    }
    const service = report.provider && report.provider !== 'NONE' ? report.provider : 'the AI service';
    const reason =
      report.aiKey !== 'set'
        ? 'no AI key was found on the server. Add OPENROUTER_API_KEY in Vercel, then redeploy'
        : report.keyAccepted === false
          ? `${service} rejected the key. Check it was copied in full, with no spaces or quote marks, then redeploy`
          : report.keyAccepted === true && report.firebaseProjectId?.startsWith('MISSING')
            ? 'the key is fine, but the server has no Firebase project id'
            : report.keyAccepted === true
              ? `the key is accepted, but no suitable ${service} model is available to it`
              : (report.problem ?? 'the set-up check could not be completed');
    aiAvailable = false;
    aiStatus = { state: 'off', reason };
    return aiStatus;
  } catch {
    aiStatus = { state: 'off', reason: 'the AI server could not be reached' };
    return aiStatus;
  }
}

/** For tests. */
export function resetAiAvailability(): void {
  aiAvailable = null;
  aiStatus = { state: 'unknown' };
}
