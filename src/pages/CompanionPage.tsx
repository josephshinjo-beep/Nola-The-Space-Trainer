import { Hammer } from 'lucide-react';
import { useState } from 'react';
import { OptionGroup, type Option } from '../components/OptionGroup';
import { NolaMascot, type NolaMood } from '../features/companion/NolaMascot';
import { SpeechBubble } from '../features/companion/SpeechBubble';

const MOODS: Option<NolaMood>[] = [
  { id: 'happy', label: 'Happy' },
  { id: 'curious', label: 'Curious' },
  { id: 'excited', label: 'Excited' },
  { id: 'thinking', label: 'Thinking' },
];

const LINES: Record<NolaMood, string> = {
  happy: "Hi, I'm NOLA! I'm a training robot, and I'll be your guide to living in space.",
  curious: "Ooh, what's that? I look like this when something interesting catches my eye.",
  excited: "Woohoo! This is my face when you pass a lesson or finish a mission!",
  thinking: "Hmm, let me think. You'll see this face when I'm working out how to help you.",
};

/** Meet NOLA: try out the mascot's expressions. Chat arrives in a later batch. */
export function CompanionPage() {
  const [mood, setMood] = useState<NolaMood>('happy');

  return (
    <div className="animate-rise space-y-8">
      <h1 className="text-3xl font-semibold sm:text-4xl">Meet NOLA</h1>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <NolaMascot mood={mood} waving={mood === 'happy' || mood === 'excited'} size={200} className="shrink-0" />
        <div className="flex-1 space-y-6">
          <SpeechBubble readAloudText={LINES[mood]}>
            <span aria-live="polite">{LINES[mood]}</span>
          </SpeechBubble>
          <OptionGroup legend="See how NOLA feels" options={MOODS} value={mood} onChange={setMood} />
        </div>
      </div>

      <p className="flex items-start gap-3 rounded-2xl border-2 border-nola-soft bg-nola/10 px-4 py-3 text-lg font-semibold text-nola-soft">
        <Hammer aria-hidden="true" size={22} className="mt-1 shrink-0" />
        Chatting with NOLA isn't ready yet. Soon you'll be able to ask questions about lessons and missions here.
      </p>
    </div>
  );
}
