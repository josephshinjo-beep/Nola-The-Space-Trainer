import type { ReactNode } from 'react';
import { ReadAloudButton } from '../accessibility/ReadAloudButton';

interface SpeechBubbleProps {
  children: ReactNode;
  /** Which side the little pointer sits on, aiming at NOLA. */
  pointer?: 'left' | 'top';
  /** When given, a Listen button reads these words aloud. */
  readAloudText?: string;
  className?: string;
}

/** What NOLA is saying. Always shown as text, so it doubles as a caption. */
export function SpeechBubble({ children, pointer = 'left', readAloudText, className = '' }: SpeechBubbleProps) {
  const pointerPosition =
    pointer === 'left' ? 'left-0 top-8 -translate-x-1/2' : 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2';

  return (
    <div className={`relative rounded-3xl bg-star px-6 py-5 text-void shadow-xl shadow-void/40 ${className}`}>
      <span aria-hidden="true" className={`absolute h-5 w-5 rotate-45 rounded-sm bg-star ${pointerPosition}`} />
      <p className="mb-1 font-display text-sm font-semibold uppercase tracking-widest text-[#b84e00]">NOLA says</p>
      <div className="relative text-lg leading-relaxed">{children}</div>
      {readAloudText && <ReadAloudButton text={readAloudText} className="mt-3" />}
    </div>
  );
}
