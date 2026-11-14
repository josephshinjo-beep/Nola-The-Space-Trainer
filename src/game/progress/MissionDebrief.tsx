import { Award, Check, CircleMinus, Lightbulb, Lock, Scale, Star, Trophy } from 'lucide-react';
import { ReadAloudButton } from '../../features/accessibility/ReadAloudButton';
import { NolaMascot } from '../../features/companion/NolaMascot';
import { SOL_CONFIG } from '../../sol/config';
import type { SolState } from '../../sol/types';
import { biggestTradeOff, plannerLessons, scoreMission, type BadgeStatus, type Rank } from './record';

/** A bar with its number written next to it, so it never relies on colour or length alone. */
function ScoreBar({ label, points, max }: { label: string; points: number; max: number }) {
  return (
    <div>
      <p className="flex justify-between text-base font-semibold">
        <span>{label}</span>
        <span>
          {points} of {max}
        </span>
      </p>
      <div className="mt-1 h-3 overflow-hidden rounded-full border border-line bg-void" aria-hidden="true">
        <div className="h-full bg-glow" style={{ width: `${(points / max) * 100}%` }} />
      </div>
    </div>
  );
}

/**
 * The end-of-mission debrief: the biggest trade-off, what real mission
 * planners do, and a score for survival and good reasoning.
 */
export function MissionDebrief({ state, rank, badges }: { state: SolState; rank: Rank | null; badges: BadgeStatus[] }) {
  const score = scoreMission(state);
  const trade = biggestTradeOff(state);
  const lessons = plannerLessons(state, score);
  const complete = state.status === 'complete';
  const earned = badges.filter((badge) => badge.earned);
  const speech = [
    complete ? 'Mission complete!' : `The mission ended on sol ${state.sol}.`,
    `Your score is ${score.total} out of 100: ${score.rating}.`,
    `Survival: ${score.survival.points} out of ${score.survival.max}. Good reasoning: ${score.reasoning.points} out of ${score.reasoning.max}.`,
    trade ? `Your biggest trade-off: ${trade.text}` : '',
    'What real mission planners do.',
    ...lessons.map((lesson) => lesson.text),
    rank ? `Your rank is ${rank.title}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <NolaMascot mood={complete ? 'excited' : 'thinking'} size={72} floating={false} className="shrink-0" />
        <div className="space-y-1">
          <p className="text-xl font-semibold">{complete ? 'Mission complete! Here is your debrief.' : `The mission ended on sol ${state.sol}. Here is what we can learn.`}</p>
          <ReadAloudButton text={speech} tone="dark" />
        </div>
      </div>

      <section aria-labelledby="debrief-score" className="space-y-3 rounded-2xl border-2 border-glow p-4">
        <h3 id="debrief-score" className="flex flex-wrap items-baseline gap-x-3 font-display text-2xl font-semibold">
          <Trophy aria-hidden="true" size={24} className="self-center text-glow" /> Score: {score.total} / 100
          <span className="text-lg text-nola-soft">{score.rating}</span>
        </h3>
        <p className="text-base text-mist">The score is about surviving and thinking well, not about how much is left in the stores.</p>
        <ScoreBar label={`Survival (${score.survival.sols} of ${SOL_CONFIG.time.missionLengthSols.value} sols)`} points={score.survival.points} max={score.survival.max} />
        <ScoreBar label="Good reasoning" points={score.reasoning.points} max={score.reasoning.max} />
        <ul className="space-y-2">
          {score.reasoning.parts.map((part) => (
            <li key={part.id} className="flex items-start gap-2 text-base">
              {part.share === null ? (
                <CircleMinus aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-mist" />
              ) : part.share >= 0.7 ? (
                <Check aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-go" />
              ) : (
                <Star aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-nola-soft" />
              )}
              <span>
                <strong>{part.title}:</strong> {part.detail}.{part.share === null ? ' Not counted.' : part.share >= 0.7 ? ' Great!' : ' Room to grow.'}
                <span className="block text-sm text-mist">{part.explain}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {trade && (
        <section aria-labelledby="debrief-trade" className="rounded-2xl border-2 border-line p-4">
          <h3 id="debrief-trade" className="flex items-center gap-2 font-display text-xl font-semibold">
            <Scale aria-hidden="true" size={22} className="text-nola-soft" /> Your biggest trade-off was…
          </h3>
          <p className="mt-2 text-lg">{trade.text}</p>
        </section>
      )}

      <section aria-labelledby="debrief-planners" className="rounded-2xl border-2 border-line p-4">
        <h3 id="debrief-planners" className="flex items-center gap-2 font-display text-xl font-semibold">
          <Lightbulb aria-hidden="true" size={22} className="text-glow" /> What real mission planners do
        </h3>
        <ul className="mt-2 list-disc space-y-2 pl-6 text-lg">
          {lessons.map((lesson) => (
            <li key={lesson.id}>{lesson.text}</li>
          ))}
        </ul>
      </section>

      {(rank || badges.length > 0) && (
        <section aria-labelledby="debrief-rank" className="rounded-2xl border-2 border-line p-4">
          <h3 id="debrief-rank" className="flex items-center gap-2 font-display text-xl font-semibold">
            <Award aria-hidden="true" size={22} className="text-nola-soft" /> {rank ? `Your rank: ${rank.title}` : 'Your badges'}
          </h3>
          {rank?.next && (
            <p className="mt-1 text-base text-mist">
              Next rank: {rank.next.title}
              {rank.next.pointsNeeded > 0 ? ` (${rank.next.pointsNeeded} more points)` : ''}. {rank.next.extra ?? ''}
            </p>
          )}
          <p className="mt-2 text-base">
            Badges earned: {earned.length} of {badges.length}
          </p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <li key={badge.id} className={`flex items-center gap-1 rounded-full border-2 px-3 py-1 text-sm font-bold ${badge.earned ? 'border-nola' : 'border-line text-mist'}`}>
                {badge.earned ? <Check aria-hidden="true" size={14} /> : <Lock aria-hidden="true" size={14} />} {badge.title}
                <span className="sr-only">{badge.earned ? '(earned)' : '(not earned yet)'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
