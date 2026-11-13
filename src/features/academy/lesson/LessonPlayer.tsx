import { ArrowLeft, ArrowRight, Check, KeyRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Button, buttonClasses } from '../../../components/Button';
import { ReadAloudButton } from '../../accessibility/ReadAloudButton';
import { NolaMascot } from '../../companion/NolaMascot';
import { SpeechBubble } from '../../companion/SpeechBubble';
import { useAcademyProgress } from '../AcademyProgressContext';
import { CURRICULUM, LESSON_STAGES, type AcademyModule } from '../curriculum';
import type { FactKind, Lesson } from '../lessonTypes';
import { EMPTY_PROGRESS, isQuizPass } from '../progress';
import { ExploreStage } from './ExploreStage';
import { ChallengeStage, QuizStage } from './QuizStage';

const FACT_LABEL: Record<FactKind, string> = {
  today: 'Used today',
  research: 'Being researched',
  future: 'Future idea',
};

const STAGE = { intro: 0, learn: 1, explore: 2, quiz: 3, challenge: 4, unlock: 5 } as const;

/** NOLA's opening lines, one bubble at a time. */
function IntroStage({ lines, onDone }: { lines: string[]; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const line = lines[index] ?? '';
  const last = index >= lines.length - 1;
  return (
    <section className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <NolaMascot mood={last ? 'excited' : 'happy'} waving={index === 0} size={170} className="shrink-0" />
      <div className="flex-1 space-y-5">
        <SpeechBubble readAloudText={line}>
          <span aria-live="polite">{line}</span>
        </SpeechBubble>
        <Button onClick={() => (last ? onDone() : setIndex(index + 1))}>
          {last ? "Let's learn!" : 'Next'} <ArrowRight aria-hidden="true" size={20} />
        </Button>
      </div>
    </section>
  );
}

/** The Learn cards: one big idea per card. */
function LearnStage({ lesson, onDone }: { lesson: Lesson; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const card = lesson.cards[index];
  if (!card) return null;
  const Icon = card.icon;
  const last = index >= lesson.cards.length - 1;

  return (
    <section aria-labelledby="card-title" className="space-y-6">
      <div key={index} className="animate-rise grid gap-6 rounded-3xl border-2 border-line bg-void/40 p-5 sm:grid-cols-[auto_1fr] sm:p-8">
        <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border-4 border-glow/40 bg-panel text-glow shadow-[0_0_40px_rgb(61_224_245/0.25)] animate-float sm:h-40 sm:w-40">
          <Icon aria-hidden="true" size={72} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 space-y-4">
          <p className="text-sm font-bold uppercase tracking-widest text-mist">
            Card {index + 1} of {lesson.cards.length}
          </p>
          <h2 id="card-title" className="text-2xl font-semibold sm:text-3xl">
            {card.title}
          </h2>
          <p className="text-xl leading-relaxed">{card.text}</p>
          {card.fact && (
            <p className="rounded-2xl border-2 border-line bg-hull p-4 text-lg">
              <span className="mr-2 inline-block rounded-full bg-nola px-3 py-0.5 text-sm font-bold text-void">{FACT_LABEL[card.fact.kind]}</span>
              {card.fact.text}
            </p>
          )}
          <div className="w-fit rounded-full bg-star">
            <ReadAloudButton text={`${card.title} ${card.text} ${card.fact?.text ?? ''}`} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          <ArrowLeft aria-hidden="true" size={20} /> Back
        </Button>
        <ol aria-hidden="true" className="flex gap-2">
          {lesson.cards.map((item, dot) => (
            <li key={item.title} className={`h-3 w-3 rounded-full ${dot === index ? 'bg-nola' : dot < index ? 'bg-glow' : 'bg-line'}`} />
          ))}
        </ol>
        <Button onClick={() => (last ? onDone() : setIndex(index + 1))}>
          {last ? 'Time to explore' : 'Next'} <ArrowRight aria-hidden="true" size={20} />
        </Button>
      </div>
    </section>
  );
}

/** The celebration at the end: what was unlocked and where to go next. */
function UnlockStage({ module }: { module: AcademyModule }) {
  const next = CURRICULUM.find((candidate) => candidate.number === module.number + 1);
  const message = `Module complete! You have unlocked ${module.unlock.name} on your station.`;
  return (
    <section className="flex flex-col items-center gap-5 text-center">
      <NolaMascot mood="excited" waving size={190} />
      <h2 className="text-3xl font-semibold sm:text-4xl">Module complete!</h2>
      <div className="animate-rise w-full max-w-xl rounded-3xl border-2 border-nola bg-nola/10 p-6">
        <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-nola-soft">
          <KeyRound aria-hidden="true" size={18} /> Station unlock
        </p>
        <p className="mt-2 font-display text-2xl font-semibold">{module.unlock.name}</p>
        <p className="mt-1 text-lg text-mist">{module.unlock.description}</p>
      </div>
      <div className="rounded-full bg-star">
        <ReadAloudButton text={message} />
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/mission" className={buttonClasses('primary')}>
          Go to your station
        </Link>
        {next ? (
          <Link to={`/academy/${next.id}`} className={buttonClasses('secondary')}>
            Next module: {next.title}
          </Link>
        ) : (
          <Link to="/academy" className={buttonClasses('secondary')}>
            Back to the Academy
          </Link>
        )}
      </div>
    </section>
  );
}

interface LessonPlayerProps {
  module: AcademyModule;
  lesson: Lesson;
}

/**
 * Runs one lesson through its six stages and saves progress as it goes,
 * so a student who leaves can pick up where they stopped.
 */
export function LessonPlayer({ module, lesson }: LessonPlayerProps) {
  const { progress, save } = useAcademyProgress();
  const saved = progress[module.id] ?? EMPTY_PROGRESS;
  const reviewing = saved.completed;

  // Resume at the saved stage; a completed lesson reopens at the start for review.
  const [stage, setStage] = useState(() => (saved.completed ? STAGE.intro : Math.min(saved.stage, STAGE.challenge)));
  const [exploreSolved, setExploreSolved] = useState(saved.stage > STAGE.explore || saved.completed);
  const [challengeSolved, setChallengeSolved] = useState(saved.challengeDone);
  const [saveError, setSaveError] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move keyboard and screen-reader focus to the top of each new stage.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) firstRender.current = false;
    else headingRef.current?.focus();
  }, [stage]);

  function persist(changes: Parameters<typeof save>[1]) {
    save(module.id, changes).catch((error) => {
      console.error('Could not save progress', error);
      setSaveError(true);
    });
  }

  function goTo(next: number) {
    setStage(next);
    if (next > saved.stage) persist({ stage: next });
  }

  function handleQuizFinished(correct: number, total: number) {
    const passed = isQuizPass(correct, total);
    persist({
      lastScore: correct,
      quizTotal: total,
      bestScore: Math.max(correct, saved.bestScore ?? 0),
      attempts: saved.attempts + 1,
      quizPassed: saved.quizPassed || passed,
    });
  }

  function handleChallengeSolved() {
    setChallengeSolved(true);
    persist({ challengeDone: true, completed: saved.quizPassed, stage: STAGE.unlock });
  }

  // Which stages the student may jump to from the stepper.
  const furthest = reviewing ? STAGE.unlock : Math.max(saved.stage, stage);

  return (
    <div className="space-y-8">
      <Link to={`/academy/${module.id}`} className="inline-flex min-h-11 items-center gap-2 font-semibold text-glow">
        <ArrowLeft aria-hidden="true" size={18} /> {module.title}
      </Link>

      <nav aria-label="Lesson stages">
        <ol className="flex flex-wrap gap-2">
          {LESSON_STAGES.map((item, index) => {
            const current = index === stage;
            const reachable = index <= furthest;
            return (
              <li key={item.name}>
                <button
                  type="button"
                  disabled={!reachable}
                  aria-current={current ? 'step' : undefined}
                  onClick={() => setStage(index)}
                  className={`flex min-h-11 items-center gap-2 rounded-full border-2 px-3 text-sm font-bold transition sm:px-4 ${
                    current ? 'border-nola bg-nola text-void' : reachable ? 'border-glow text-star hover:bg-panel' : 'border-line text-mist opacity-60'
                  }`}
                >
                  <span aria-hidden="true">{index < furthest && !current ? <Check size={16} /> : index + 1}</span>
                  <span className={current ? '' : 'hidden md:inline'}>{item.name}</span>
                  <span className="sr-only md:hidden">{current ? '' : item.name}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {saveError && (
        <p role="alert" className="rounded-2xl border-2 border-alert bg-alert/10 px-4 py-3 font-semibold text-alert">
          <span aria-hidden="true">⚠ </span>
          Your progress could not be saved just now. Check your connection; it will be sent when you are back online.
        </p>
      )}

      <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold outline-none sm:text-4xl">
        {LESSON_STAGES[stage]?.name}
      </h1>

      <div className="rounded-3xl border-2 border-line bg-hull/80 p-5 sm:p-8">
        {stage === STAGE.intro && <IntroStage lines={lesson.intro} onDone={() => goTo(STAGE.learn)} />}
        {stage === STAGE.learn && <LearnStage lesson={lesson} onDone={() => goTo(STAGE.explore)} />}
        {stage === STAGE.explore && (
          <div className="space-y-6">
            <ExploreStage activity={lesson.explore} onSolved={() => setExploreSolved(true)} />
            <Button disabled={!exploreSolved} onClick={() => goTo(STAGE.quiz)}>
              {exploreSolved ? 'Take the knowledge check' : 'Finish the activity to continue'} <ArrowRight aria-hidden="true" size={20} />
            </Button>
          </div>
        )}
        {stage === STAGE.quiz && (
          <QuizStage questions={lesson.quiz} onFinished={handleQuizFinished} onContinue={() => goTo(STAGE.challenge)} onReview={() => setStage(STAGE.learn)} />
        )}
        {stage === STAGE.challenge &&
          (saved.quizPassed ? (
            <div className="space-y-6">
              <ChallengeStage challenge={lesson.challenge} onSolved={handleChallengeSolved} />
              {(challengeSolved || reviewing) && (
                <Button onClick={() => setStage(STAGE.unlock)}>
                  See what you unlocked <ArrowRight aria-hidden="true" size={20} />
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-lg">Pass the knowledge check first, then the mission challenge opens.</p>
              <Button onClick={() => setStage(STAGE.quiz)}>Go to the knowledge check</Button>
            </div>
          ))}
        {stage === STAGE.unlock &&
          (saved.completed ? (
            <UnlockStage module={module} />
          ) : (
            <p className="text-lg">Pass the knowledge check and solve the mission challenge to unlock {module.unlock.name}.</p>
          ))}
      </div>
    </div>
  );
}
