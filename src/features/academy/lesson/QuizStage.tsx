import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/Button';
import { NolaMascot } from '../../companion/NolaMascot';
import type { ChallengeStep, Lesson, QuizQuestion } from '../lessonTypes';
import { isQuizPass, PASS_MARK } from '../progress';

interface ChoiceListProps {
  options: { text: string; state: 'idle' | 'right' | 'wrong' | 'dim' }[];
  disabled: boolean;
  onChoose: (index: number) => void;
}

/** Answer buttons. Right and wrong show an icon and words, never colour alone. */
function ChoiceList({ options, disabled, onChoose }: ChoiceListProps) {
  return (
    <div className="grid gap-3">
      {options.map((option, index) => (
        <button
          key={option.text}
          type="button"
          disabled={disabled || option.state === 'wrong'}
          onClick={() => onChoose(index)}
          className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-lg font-semibold transition ${
            option.state === 'right'
              ? 'border-go bg-go/15 text-star'
              : option.state === 'wrong'
                ? 'border-alert bg-alert/10 text-mist'
                : option.state === 'dim'
                  ? 'border-line bg-void/30 text-mist'
                  : 'border-line bg-void/50 text-star hover:border-glow'
          }`}
        >
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel font-display">
            {option.state === 'right' ? <Check size={18} className="text-go" /> : option.state === 'wrong' ? <X size={18} className="text-alert" /> : String.fromCharCode(65 + index)}
          </span>
          <span className="min-w-0 flex-1">{option.text}</span>
          {option.state === 'right' && <span className="sr-only">(correct)</span>}
          {option.state === 'wrong' && <span className="sr-only">(not correct)</span>}
        </button>
      ))}
    </div>
  );
}

interface QuizStageProps {
  questions: QuizQuestion[];
  /** Called once per finished attempt with the number of correct answers. */
  onFinished: (correct: number, total: number) => void;
  onContinue: () => void;
  onReview: () => void;
}

/** The Knowledge Check: one question at a time, with an explanation after each. */
export function QuizStage({ questions, onFinished, onContinue, onReview }: QuizStageProps) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const total = questions.length;
  const question = questions[index];

  function restart() {
    setIndex(0);
    setPicked(null);
    setCorrect(0);
    setDone(false);
  }

  if (done || !question) {
    const passed = isQuizPass(correct, total);
    return (
      <section className="flex flex-col items-center gap-5 text-center" role="status">
        <NolaMascot mood={passed ? 'excited' : 'thinking'} waving={passed} size={150} />
        <h2 className="text-3xl font-semibold">
          You scored {correct} out of {total}
        </h2>
        <p className="max-w-xl text-lg text-mist">
          {passed
            ? correct === total
              ? 'A perfect score! Outstanding work, cadet.'
              : 'You passed! Great work. One more step to go: the mission challenge.'
            : `So close! You need ${Math.ceil(total * PASS_MARK)} out of ${total} to pass. Every astronaut retakes tests; that is how they learn. Look back over the lesson, then try again.`}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {passed ? (
            <>
              <Button onClick={onContinue}>On to the mission challenge</Button>
              <Button variant="secondary" onClick={restart}>
                Retake for a higher score
              </Button>
            </>
          ) : (
            <>
              <Button onClick={restart}>Try the quiz again</Button>
              <Button variant="secondary" onClick={onReview}>
                Review the lesson
              </Button>
            </>
          )}
        </div>
      </section>
    );
  }

  const answered = picked !== null;
  const wasRight = picked === question.answer;

  function choose(option: number) {
    if (answered || !question) return;
    setPicked(option);
    if (option === question.answer) setCorrect((count) => count + 1);
  }

  function next() {
    if (index + 1 >= total) {
      setDone(true);
      onFinished(correct, total);
    } else {
      setIndex(index + 1);
      setPicked(null);
    }
  }

  return (
    <section aria-labelledby="quiz-question" className="space-y-5">
      <p className="text-sm font-bold uppercase tracking-widest text-mist">
        Question {index + 1} of {total}
      </p>
      <h2 id="quiz-question" className="text-2xl font-semibold">
        {question.question}
      </h2>
      <ChoiceList
        disabled={answered}
        onChoose={choose}
        options={question.options.map((text, option) => ({
          text,
          state: !answered ? 'idle' : option === question.answer ? 'right' : option === picked ? 'wrong' : 'dim',
        }))}
      />
      <div role="status" className="min-h-24">
        {answered && (
          <div className="space-y-4">
            <p className="text-lg">
              <strong className={wasRight ? 'text-go' : 'text-nola-soft'}>{wasRight ? 'Correct! ' : 'Not quite. '}</strong>
              {question.explanation}
            </p>
            <Button onClick={next}>{index + 1 >= total ? 'See my score' : 'Next question'}</Button>
          </div>
        )}
      </div>
    </section>
  );
}

interface ChallengeStageProps {
  challenge: Lesson['challenge'];
  onSolved: () => void;
}

/** The Mission Challenge: a short story problem. Wrong choices explain why, then let you retry. */
export function ChallengeStage({ challenge, onSolved }: ChallengeStageProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [right, setRight] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const step: ChallengeStep | undefined = challenge.steps[stepIndex];

  if (!step) {
    return (
      <section role="status" className="flex flex-col items-center gap-4 text-center">
        <NolaMascot mood="excited" waving size={150} />
        <h2 className="text-3xl font-semibold">Challenge complete!</h2>
        <p className="max-w-xl text-lg text-mist">{challenge.success}</p>
      </section>
    );
  }

  function choose(option: number) {
    const chosen = step?.options[option];
    if (!chosen || right !== null) return;
    setFeedback(chosen.feedback);
    if (chosen.correct) setRight(option);
    else setWrong((list) => [...list, option]);
  }

  function next() {
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    setWrong([]);
    setRight(null);
    setFeedback(null);
    if (nextIndex >= challenge.steps.length) onSolved();
  }

  return (
    <section aria-labelledby="challenge-title" className="space-y-5">
      <h2 id="challenge-title" className="text-2xl font-semibold">
        {challenge.title}
      </h2>
      {stepIndex === 0 && <p className="rounded-2xl border-2 border-nola bg-nola/10 p-4 text-lg">{challenge.scenario}</p>}
      <p className="text-sm font-bold uppercase tracking-widest text-mist">
        Decision {stepIndex + 1} of {challenge.steps.length}
      </p>
      <p className="font-display text-xl">{step.prompt}</p>
      <ChoiceList
        disabled={right !== null}
        onChoose={choose}
        options={step.options.map((option, index) => ({
          text: option.text,
          state: right === index ? 'right' : wrong.includes(index) ? 'wrong' : right !== null ? 'dim' : 'idle',
        }))}
      />
      <div role="status" className="min-h-24 space-y-4">
        {feedback && (
          <p className="text-lg">
            <strong className={right !== null ? 'text-go' : 'text-nola-soft'}>{right !== null ? 'Good call. ' : 'Try again. '}</strong>
            {feedback}
          </p>
        )}
        {right !== null && <Button onClick={next}>{stepIndex + 1 >= challenge.steps.length ? 'Finish the challenge' : 'Next decision'}</Button>}
      </div>
    </section>
  );
}
