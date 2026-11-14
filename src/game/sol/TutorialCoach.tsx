import { ReadAloudButton } from '../../features/accessibility/ReadAloudButton';
import { NolaMascot } from '../../features/companion/NolaMascot';
import { TUTORIAL_STEPS, type TutorialStep } from './tutorial';

/** NOLA's tutorial note: the step, a Listen button, and a way to skip. */
export function TutorialCoach({ step, onSkip }: { step: TutorialStep; onSkip?: () => void }) {
  return (
    <section aria-label="Tutorial" className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border-2 border-nola bg-hull/95 p-3 backdrop-blur">
      <NolaMascot mood="excited" size={56} floating={false} className="shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-nola-soft">
          Tutorial sol · Step {step.number} of {TUTORIAL_STEPS}
        </p>
        <p aria-live="polite" className="text-base font-semibold">
          {step.text}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <ReadAloudButton text={step.text} tone="dark" />
          {onSkip && (
            <button type="button" onClick={onSkip} className="text-sm font-bold text-mist underline">
              Skip the tutorial
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
