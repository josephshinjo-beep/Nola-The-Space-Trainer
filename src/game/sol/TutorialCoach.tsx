import { useState } from 'react';
import { ReadAloudButton } from '../../features/accessibility/ReadAloudButton';
import { NolaMascot } from '../../features/companion/NolaMascot';
import { TUTORIAL_STEPS, type TutorialStep } from './tutorial';

/** NOLA's tutorial note: the step, a Listen button, and a way to skip. */
export function TutorialCoach({ step, onSkip }: { step: TutorialStep; onSkip?: () => void }) {
  // On phones the note shows two lines until the student asks for more, so it does not cover the station.
  const [more, setMore] = useState(false);
  return (
    <section aria-label="Tutorial" className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border-2 border-nola bg-hull/95 p-3 backdrop-blur compact:max-w-[24rem] compact:gap-2 compact:p-2">
      <NolaMascot mood="excited" size={56} floating={false} className="shrink-0 compact:hidden" />
      <div className="min-w-0 flex-1 space-y-2 compact:space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-nola-soft">
          Tutorial sol · Step {step.number} of {TUTORIAL_STEPS}
        </p>
        <p aria-live="polite" className={`text-base font-semibold compact:text-sm ${more ? '' : 'compact:line-clamp-2'}`}>
          {step.text}
        </p>
        <div className="flex flex-wrap items-center gap-3 compact:gap-2">
          <button type="button" onClick={() => setMore(!more)} aria-expanded={more} className="hidden text-sm font-bold text-glow underline compact:inline">
            {more ? 'Less' : 'More'}
          </button>
          <span className={more ? '' : 'compact:hidden'}>
            <ReadAloudButton text={step.text} tone="dark" />
          </span>
          {onSkip && (
            <button type="button" onClick={onSkip} className="text-sm font-bold text-mist underline compact:text-xs">
              Skip the tutorial
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
