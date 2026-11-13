import { BookOpen, Send, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/Button';
import { ReadAloudButton } from '../features/accessibility/ReadAloudButton';
import { useAcademyProgress } from '../features/academy/AcademyProgressContext';
import { useAuth } from '../features/auth/AuthContext';
import { askNola, type ChatTurn } from '../features/companion/chatService';
import { loadKnowledge, searchKnowledge, type Passage } from '../features/companion/knowledge';
import { NolaMascot, type NolaMood } from '../features/companion/NolaMascot';
import { buildContext, SUGGESTED_QUESTIONS, type Reply } from '../features/companion/responder';
import { loadSimulation } from '../services/simulationRepository';
import type { StationState } from '../simulation/types';

const MAX_LENGTH = 500;

type Message = { id: number; from: 'student'; text: string } | { id: number; from: 'nola'; reply: Reply };

const WELCOME: Reply = {
  text: "Hi! I'm NOLA, your space-training robot. Ask me anything about living in space, or pick a question below to get started.",
  mood: 'excited',
  sources: [],
  origin: 'built-in',
};

/** Ask NOLA: a chat with the companion about lessons, missions and space. */
export function CompanionPage() {
  const { user } = useAuth();
  const { progress } = useAcademyProgress();
  const [messages, setMessages] = useState<Message[]>([{ id: 0, from: 'nola', reply: WELCOME }]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [knowledge, setKnowledge] = useState<Passage[]>([]);
  // The saved station, loaded once. Kept as a promise so a question asked
  // straight away waits for it instead of answering without it.
  const stationLoad = useRef<Promise<StationState | null>>(Promise.resolve(null));
  const nextId = useRef(1);
  const listEnd = useRef<HTMLDivElement>(null);

  // NOLA's knowledge base, and a read-only look at the saved station for hints.
  useEffect(() => {
    let cancelled = false;
    loadKnowledge()
      .then((passages) => !cancelled && setKnowledge(passages))
      .catch((error) => console.error('Could not load knowledge', error));
    if (user) {
      stationLoad.current = loadSimulation(user.uid).catch((error) => {
        console.error('Could not load station', error);
        return null;
      });
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    listEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, thinking]);

  async function send(text: string) {
    const message = text.trim().slice(0, MAX_LENGTH);
    if (!message || thinking) return;
    setDraft('');
    const history: ChatTurn[] = messages.slice(1).map((item) => (item.from === 'student' ? { role: 'user', content: item.text } : { role: 'assistant', content: item.reply.text }));
    setMessages((list) => [...list, { id: nextId.current++, from: 'student', text: message }]);
    setThinking(true);
    const station = await stationLoad.current;
    const reply = await askNola({
      message,
      history,
      hits: searchKnowledge(knowledge, message),
      context: buildContext(progress, station),
      getToken: async () => (user ? user.getIdToken() : null),
    });
    setMessages((list) => [...list, { id: nextId.current++, from: 'nola', reply }]);
    setThinking(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  const lastReply = [...messages].reverse().find((item) => item.from === 'nola');
  const mood: NolaMood = thinking ? 'thinking' : lastReply?.from === 'nola' ? lastReply.reply.mood : 'happy';

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-4">
        <NolaMascot mood={mood} waving={messages.length === 1} size={96} className="shrink-0" />
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Ask NOLA</h1>
          <p className="text-lg text-mist">Your robot companion for lessons, missions and space questions.</p>
        </div>
      </header>

      <section aria-label="Conversation with NOLA" className="rounded-3xl border-2 border-line bg-hull/80 p-4 sm:p-6">
        <ol className="space-y-4" aria-live="polite">
          {messages.map((item) =>
            item.from === 'student' ? (
              <li key={item.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-3xl rounded-br-md bg-nola px-5 py-3 text-lg font-semibold text-void">
                  <span className="sr-only">You said: </span>
                  {item.text}
                </p>
              </li>
            ) : (
              <li key={item.id} className="flex justify-start">
                <div className="max-w-[90%] rounded-3xl rounded-bl-md bg-star px-5 py-4 text-void">
                  <p className="mb-1 font-display text-sm font-semibold uppercase tracking-widest text-[#b84e00]">NOLA {item.reply.origin === 'ai' ? '· AI answer' : ''}</p>
                  <p className="whitespace-pre-line text-lg leading-relaxed">{item.reply.text}</p>
                  {item.reply.sources.length > 0 && (
                    <p className="mt-3 flex flex-wrap items-center gap-2 text-base font-semibold">
                      <BookOpen aria-hidden="true" size={18} />
                      Read more:
                      {item.reply.sources.map((source) => (
                        <Link key={source.to + source.label} to={source.to} className="rounded-full border-2 border-void/30 px-3 py-0.5 underline-offset-4 hover:underline">
                          {source.label}
                        </Link>
                      ))}
                    </p>
                  )}
                  <ReadAloudButton text={item.reply.text} className="mt-3" />
                </div>
              </li>
            ),
          )}
          {thinking && (
            <li className="flex justify-start">
              <p role="status" className="rounded-3xl rounded-bl-md bg-star px-5 py-3 text-lg font-semibold text-void">
                NOLA is thinking…
              </p>
            </li>
          )}
        </ol>
        <div ref={listEnd} />
      </section>

      <section aria-label="Suggested questions" className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            disabled={thinking}
            onClick={() => void send(question)}
            className="min-h-11 rounded-full border-2 border-line bg-panel px-4 py-2 text-left font-semibold transition hover:border-glow disabled:opacity-60"
          >
            {question}
          </button>
        ))}
      </section>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="chat-input" className="sr-only">
          Your question for NOLA
        </label>
        <input
          id="chat-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={MAX_LENGTH}
          autoComplete="off"
          placeholder="Type your question…"
          className="min-h-12 flex-1 rounded-2xl border-2 border-line bg-void/60 px-4 py-3 text-lg text-star placeholder:text-mist/60"
        />
        <Button type="submit" disabled={thinking || !draft.trim()}>
          <Send aria-hidden="true" size={20} /> Send
        </Button>
      </form>

      <p className="flex items-start gap-2 text-base text-mist">
        <ShieldCheck aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-glow" />
        Stay safe: never share personal details like your full name, address, school or passwords. This chat is not saved. NOLA is a robot and can make mistakes, so check anything important in your lessons.
      </p>
    </div>
  );
}
