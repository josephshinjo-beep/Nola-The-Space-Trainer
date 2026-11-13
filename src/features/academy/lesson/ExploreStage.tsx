import { ArrowDown, ArrowUp, Check, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../../components/Button';
import type { ExploreActivity, SequenceActivity, SliderActivity, SortActivity } from '../lessonTypes';

interface ActivityProps<T> {
  activity: T;
  onSolved: () => void;
}

const STATUS_STYLE = {
  good: { bar: 'bg-go', text: 'text-go', word: 'Good' },
  warn: { bar: 'bg-nola-soft', text: 'text-nola-soft', word: 'Nearly' },
  bad: { bar: 'bg-alert', text: 'text-alert', word: 'Problem' },
} as const;

/** Sort statements into groups, one at a time. */
function SortGame({ activity, onSolved }: ActivityProps<SortActivity>) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ right: boolean; text: string } | null>(null);
  const item = activity.items[index];

  if (!item) {
    return (
      <p role="status" className="rounded-2xl border-2 border-go bg-go/10 p-4 text-lg font-semibold text-go">
        <Check aria-hidden="true" className="mr-2 inline" size={20} />
        All sorted! You know your worlds.
      </p>
    );
  }

  function choose(binId: string) {
    if (!item) return;
    const right = binId === item.bin;
    setFeedback({ right, text: right ? item.why : 'Not that one. Have another think and try again.' });
  }

  function next() {
    setFeedback(null);
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex >= activity.items.length) onSolved();
  }

  return (
    <div className="space-y-5">
      <p className="text-sm font-bold uppercase tracking-widest text-mist">
        Clue {index + 1} of {activity.items.length}
      </p>
      <p className="rounded-2xl border-2 border-line bg-void/50 p-5 font-display text-xl">{item.text}</p>

      {feedback?.right ? (
        <div role="status" className="space-y-4">
          <p className="text-lg font-semibold text-go">
            <Check aria-hidden="true" className="mr-2 inline" size={20} />
            Correct! {feedback.text}
          </p>
          <Button onClick={next}>{index + 1 >= activity.items.length ? 'Finish' : 'Next clue'}</Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            {activity.bins.map((bin) => (
              <Button key={bin.id} variant="secondary" onClick={() => choose(bin.id)}>
                {bin.label}
              </Button>
            ))}
          </div>
          <p role="status" className="min-h-7 text-lg font-semibold text-alert">
            {feedback && (
              <>
                <X aria-hidden="true" className="mr-2 inline" size={20} />
                {feedback.text}
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}

/** A fixed shuffle, so the starting order is mixed but the same every time. */
function scrambled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = (i * 7 + 3) % (i + 1);
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

/** Put steps in order using up and down buttons (no dragging needed). */
function SequenceGame({ activity, onSolved }: ActivityProps<SequenceActivity>) {
  const [order, setOrder] = useState(() => scrambled(activity.steps));
  const [checked, setChecked] = useState(false);
  const solved = order.every((step, i) => step === activity.steps[i]);

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[from], next[to]] = [next[to] as string, next[from] as string];
    setOrder(next);
    setChecked(false);
  }

  function check() {
    setChecked(true);
    if (solved) onSolved();
  }

  return (
    <div className="space-y-5">
      <ol className="space-y-3">
        {order.map((step, i) => {
          const right = checked && step === activity.steps[i];
          const wrong = checked && !right;
          return (
            <li
              key={step}
              className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${right ? 'border-go bg-go/10' : wrong ? 'border-alert bg-alert/10' : 'border-line bg-void/50'}`}
            >
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-panel font-display font-bold">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 text-lg">
                {step}
                {checked && <span className="sr-only">{right ? ' (right place)' : ' (wrong place)'}</span>}
              </span>
              {right && <Check aria-hidden="true" className="shrink-0 text-go" size={22} />}
              {wrong && <X aria-hidden="true" className="shrink-0 text-alert" size={22} />}
              {!(checked && solved) && (
                <span className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(i, i - 1)}
                    aria-label={`Move step ${i + 1} up`}
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-line disabled:opacity-30"
                  >
                    <ArrowUp aria-hidden="true" size={20} />
                  </button>
                  <button
                    type="button"
                    disabled={i === order.length - 1}
                    onClick={() => move(i, i + 1)}
                    aria-label={`Move step ${i + 1} down`}
                    className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-line disabled:opacity-30"
                  >
                    <ArrowDown aria-hidden="true" size={20} />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {!(checked && solved) && <Button onClick={check}>Check my order</Button>}
      <p role="status" className={`min-h-7 text-lg font-semibold ${solved ? 'text-go' : 'text-nola-soft'}`}>
        {checked && (solved ? activity.success : 'Not quite. The ticked steps are in the right place. Move the others and check again.')}
      </p>
    </div>
  );
}

/** Adjust sliders on a small model until the goal is reached. */
function SliderGame({ activity, onSolved }: ActivityProps<SliderActivity>) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(activity.sliders.map((slider) => [slider.id, slider.initial])),
  );
  const [reported, setReported] = useState(false);
  const result = useMemo(() => activity.compute(values), [activity, values]);

  function change(id: string, value: number) {
    const next = { ...values, [id]: value };
    setValues(next);
    if (!reported && activity.compute(next).success) {
      setReported(true);
      onSolved();
    }
  }

  return (
    <div className="space-y-6">
      <p className="rounded-2xl border-2 border-nola bg-nola/10 p-4 text-lg">
        <strong className="font-display">Goal: </strong>
        {activity.goal}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          {activity.sliders.map((slider) => (
            <div key={slider.id}>
              <label htmlFor={`slider-${slider.id}`} className="mb-1 block font-display text-lg font-medium">
                {slider.label}: <span className="text-glow">{values[slider.id]} {slider.unit}</span>
              </label>
              <input
                id={`slider-${slider.id}`}
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={values[slider.id] ?? slider.initial}
                onChange={(event) => change(slider.id, Number(event.target.value))}
                className="h-11 w-full accent-nola"
              />
            </div>
          ))}
        </div>

        <div className="space-y-4" aria-live="polite">
          {result.readouts.map((readout) => {
            const style = STATUS_STYLE[readout.status];
            return (
              <div key={readout.label}>
                <div className="flex flex-wrap justify-between gap-x-3 font-semibold">
                  <span>{readout.label}</span>
                  <span className={style.text}>
                    {readout.value} · {style.word}
                  </span>
                </div>
                <div className="mt-1 h-4 overflow-hidden rounded-full border-2 border-line bg-void">
                  <div className={`h-full ${style.bar}`} style={{ width: `${Math.round(Math.min(1, Math.max(0, readout.level)) * 100)}%` }} />
                </div>
              </div>
            );
          })}
          <p className={`text-lg font-semibold ${result.success ? 'text-go' : 'text-star'}`}>
            {result.success && <Check aria-hidden="true" className="mr-2 inline" size={20} />}
            {result.message}
          </p>
        </div>
      </div>

      <p className="text-sm text-mist">{activity.modelNote}</p>
    </div>
  );
}

/** The hands-on part of a lesson. Picks the right mini-activity for the lesson's data. */
export function ExploreStage({ activity, onSolved }: ActivityProps<ExploreActivity>) {
  return (
    <section aria-labelledby="explore-title" className="space-y-4">
      <h2 id="explore-title" className="text-2xl font-semibold">
        {activity.title}
      </h2>
      <p className="text-lg text-mist">{activity.instructions}</p>
      {activity.kind === 'sort' && <SortGame activity={activity} onSolved={onSolved} />}
      {activity.kind === 'sequence' && <SequenceGame activity={activity} onSolved={onSolved} />}
      {activity.kind === 'slider' && <SliderGame activity={activity} onSolved={onSolved} />}
    </section>
  );
}
