import { ArrowDown, ArrowUp, Check, CircleAlert, Minus, Moon, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/Button';
import { Modal } from '../../components/ConfirmDialog';
import { ReadAloudButton } from '../../features/accessibility/ReadAloudButton';
import { NolaMascot } from '../../features/companion/NolaMascot';
import type { SystemId } from '../../features/unlocks/unlockManager';
import { SOL_CONFIG, type Resource } from '../../sol/config';
import type { Amounts, BodyPart } from '../../sol/types';
import { MissionDebrief } from '../progress/MissionDebrief';
import { amountWords, type BadgeStatus, type Rank } from '../progress/record';
import { ExplainButton } from './ResourceExplainer';
import { TutorialCoach } from './TutorialCoach';
import { SUMMARY_STEP, type TutorialStep } from './tutorial';
import { LINE_LABELS, pickCards, urgentPlace, type CardLine, type KidCard } from './cards';
import { pickFinding, useAstronautScience } from '../../data/astronautScience';
import { AstronautScienceCard } from '../../features/science/AstronautScienceCard';
import { urgentJob, type SolSave, type SolSummary } from './solFlow';

interface SolBriefingProps {
  save: SolSave;
  unlocked: readonly SystemId[];
  onPlan: (decisionId: string) => { ok: boolean };
  onSkip: () => void;
  onFinish: () => SolSummary | null;
  onClose: () => void;
  /** The tutorial step to show inside the console, during the tutorial sol. */
  tutorial?: TutorialStep | null;
  /** Rank and badges for the end-of-mission debrief. */
  debrief?: { rank: Rank; badges: BadgeStatus[] };
}

function Line({ line, kind }: { line: CardLine; kind: 'gain' | 'lose' }) {
  const { name, icon: Icon } = LINE_LABELS[line.resource];
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden="true" className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${kind === 'gain' ? 'bg-go/20 text-go' : 'bg-alert/20 text-alert'}`}>
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <strong className="font-display">{name}</strong>
        <ExplainButton resource={line.resource} className="ml-1 align-middle" />
        {line.tonight && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-panel px-2 py-0.5 text-xs font-bold text-nola-soft">
            <Moon aria-hidden="true" size={12} /> Tonight
          </span>
        )}
        <span className="block text-base text-mist">{line.text}</span>
      </span>
    </li>
  );
}

function Card({ card, onChoose }: { card: KidCard; onChoose: () => void }) {
  const Icon = card.icon;
  const titleId = `card-${card.decisionId}`;
  return (
    <article aria-labelledby={titleId} className="flex flex-col rounded-3xl border-2 border-line bg-void/60 p-4">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-panel text-glow">
          <Icon size={28} />
        </span>
        <h3 id={titleId} className="text-xl font-semibold leading-tight">
          {card.title}
        </h3>
      </div>

      <p className="mt-4 flex items-center gap-1 text-sm font-bold uppercase tracking-widest text-go">
        <Plus aria-hidden="true" size={16} /> You gain
      </p>
      <ul className="mt-2 space-y-2">
        {card.gain.map((line) => (
          <Line key={line.resource} line={line} kind="gain" />
        ))}
      </ul>

      <p className="mt-4 flex items-center gap-1 text-sm font-bold uppercase tracking-widest text-alert">
        <Minus aria-hidden="true" size={16} /> You lose
      </p>
      <ul className="mt-2 space-y-2">
        {card.lose.map((line) => (
          <Line key={line.resource} line={line} kind="lose" />
        ))}
      </ul>

      <p className="mt-4 flex-1 rounded-2xl bg-panel p-3 text-base">
        <strong className="font-display text-nola-soft">Urgent job: </strong>
        {card.urgent.text}
      </p>
      <Button className="mt-4 w-full" onClick={onChoose} aria-label={`Choose this plan: ${card.title}`}>
        Choose this plan
      </Button>
    </article>
  );
}

/** "You gave up 2 science points and 3 kWh of power to get more muscles & bones." */
function summaryTradeOff(summary: SolSummary): string | null {
  if (!summary.card) return null;
  const gave = (Object.entries(summary.cardCost) as [Resource, number][]).map(([resource, amount]) => amountWords(resource, amount));
  const got = [...Object.keys(summary.cardGave), ...Object.keys(summary.bodyGave)].map((key) => LINE_LABELS[key as Resource].name.toLowerCase());
  if (gave.length === 0) return null;
  const join = (items: string[]) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);
  return got.length > 0 ? `You gave up ${join(gave)} to get more ${join(got)}.` : `You gave up ${join(gave)}, but the urgent job was not done, so nothing came back.`;
}

/** "Power went down by 12" for the Listen button. */
const changeWords = (resource: Resource, delta: number) => `${LINE_LABELS[resource].name} went ${delta > 0 ? 'up' : 'down'} by ${Math.abs(Math.round(delta * 10) / 10)}`;

/** "Air, Shield" style list of the resources in an amount. */
const names = (amounts: Amounts | Partial<Record<BodyPart, number>>) =>
  (Object.keys(amounts) as (Resource | BodyPart)[]).map((resource) => {
    const { name, icon: Icon } = LINE_LABELS[resource];
    return (
      <li key={resource} className="flex items-center gap-2">
        <Icon aria-hidden="true" size={18} className="text-glow" /> {name}
      </li>
    );
  });

/**
 * The Command Console screen. In the morning it shows three plan cards;
 * after choosing it explains why the choice is real; during the day it
 * shows the urgent job; in the evening it ends the sol and sums it up.
 */
export function SolBriefing({ save, unlocked, onPlan, onSkip, onFinish, onClose, tutorial, debrief }: SolBriefingProps) {
  const [chosen, setChosen] = useState<KidCard | null>(null);
  const [summary, setSummary] = useState<SolSummary | null>(null);
  const [showDebrief, setShowDebrief] = useState(false);
  // Remember whether this was the tutorial sol before ending it (ending it finishes the tutorial).
  const [tutorialSummary, setTutorialSummary] = useState(false);
  const finish = () => {
    setTutorialSummary(tutorial !== null && tutorial !== undefined);
    setSummary(onFinish());
  };
  const science = useAstronautScience();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const { state } = save;
  const sols = SOL_CONFIG.time.missionLengthSols.value;
  const job = urgentJob(save);

  let title: string;
  let body: React.ReactNode;

  if (summary && showDebrief && state.status !== 'active') {
    title = 'Mission debrief';
    body = (
      <div className="space-y-4">
        <MissionDebrief state={state} rank={debrief?.rank ?? null} badges={debrief?.badges ?? []} />
        <Button onClick={onClose}>Close</Button>
      </div>
    );
  } else if (summary) {
    title = `Sol ${summary.sol} is over`;
    const lines = [
      summary.card ? (summary.jobDone ? 'You finished your urgent job. Well done!' : 'The urgent job was not done, so you missed what it gives.') : 'You did not choose a plan today.',
      ...summary.events,
    ];
    const trade = summaryTradeOff(summary);
    const changes = (Object.entries(summary.change) as [Resource, number][]).filter(([, delta]) => Math.abs(delta) >= 0.05);
    const speech = [...lines, trade ?? '', changes.length ? `Your stores changed today. ${changes.map(([resource, delta]) => changeWords(resource, delta)).join('. ')}.` : '', tutorialSummary ? SUMMARY_STEP.text : ''].filter(Boolean).join(' ');
    body = (
      <div className="space-y-4">
        {tutorialSummary && <TutorialCoach step={SUMMARY_STEP} />}
        <div className="flex items-start gap-3">
          <NolaMascot mood={summary.jobDone ? 'excited' : 'thinking'} size={70} floating={false} className="shrink-0" />
          <ul className="space-y-1 text-lg">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <ReadAloudButton text={speech} tone="dark" />
        {trade && (
          <p className="rounded-2xl border-2 border-line p-3 text-lg">
            <strong className="font-display text-nola-soft">Today's trade-off: </strong>
            {trade}
          </p>
        )}
        {summary.card && (
          <div className="grid gap-3 sm:grid-cols-2">
            <section className="rounded-2xl border-2 border-go/50 p-3">
              <h3 className="flex items-center gap-1 font-display text-lg text-go">
                <Plus aria-hidden="true" size={18} /> Your plan gave
              </h3>
              <ul className="mt-1">{Object.keys(summary.cardGave).length + Object.keys(summary.bodyGave).length ? names({ ...summary.cardGave, ...summary.bodyGave }) : <li>Nothing this time.</li>}</ul>
            </section>
            <section className="rounded-2xl border-2 border-alert/50 p-3">
              <h3 className="flex items-center gap-1 font-display text-lg text-alert">
                <Minus aria-hidden="true" size={18} /> Your plan cost
              </h3>
              <ul className="mt-1">{names(summary.cardCost)}</ul>
            </section>
          </div>
        )}
        {changes.length > 0 && (
          <section aria-labelledby="sol-changes" className="rounded-2xl border-2 border-line p-3">
            <h3 id="sol-changes" className="font-display text-lg">How your stores changed today (day and night)</h3>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {changes.map(([resource, delta]) => {
                const { name, icon: Icon } = LINE_LABELS[resource];
                const up = delta > 0;
                return (
                  <li key={resource} className="flex items-center gap-2 text-base">
                    <Icon aria-hidden="true" size={18} className="shrink-0 text-glow" />
                    <span className="min-w-0 flex-1">{name}</span>
                    <span className={`flex items-center gap-1 font-bold ${up ? 'text-go' : 'text-alert'}`}>
                      {up ? <ArrowUp aria-hidden="true" size={16} /> : <ArrowDown aria-hidden="true" size={16} />}
                      {up ? 'up' : 'down'} {Math.abs(Math.round(delta * 10) / 10)}
                    </span>
                    <ExplainButton resource={resource} />
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {summary.science && (() => {
          const card = pickFinding(science, summary.science, summary.sol);
          return card ? <AstronautScienceCard card={card} /> : null;
        })()}
        {summary.missionOver === 'complete' && <p className="flex items-center gap-2 rounded-2xl bg-go/15 p-3 text-lg font-semibold"><Check aria-hidden="true" size={22} /> Mission complete! You kept the crew going for all {sols} sols.</p>}
        {summary.missionOver === 'failed' && <p className="flex items-center gap-2 rounded-2xl bg-alert/15 p-3 text-lg font-semibold"><CircleAlert aria-hidden="true" size={22} /> The crew is too unwell to carry on. The mission is over.</p>}
        {summary.missionOver ? <Button onClick={() => setShowDebrief(true)}>See your mission debrief</Button> : <Button onClick={onClose}>{`Start sol ${summary.sol + 1}`}</Button>}
      </div>
    );
  } else if (state.status !== 'active') {
    title = 'Mission debrief';
    body = (
      <div className="space-y-4">
        <MissionDebrief state={state} rank={debrief?.rank ?? null} badges={debrief?.badges ?? []} />
        <p className="text-mist">To fly again, open the game menu and choose Restart the station.</p>
        <Button onClick={onClose}>Close</Button>
      </div>
    );
  } else if (chosen) {
    title = 'Plan chosen!';
    body = (
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-2xl border-2 border-glow bg-glow/10 p-4 text-lg">
          <Sparkles aria-hidden="true" size={22} className="mt-1 shrink-0 text-glow" />
          <span>
            <strong className="font-display">Why this is real: </strong>
            {chosen.whyReal}
          </span>
        </p>
        <div className="w-fit rounded-full bg-star">
          <ReadAloudButton text={`Why this is real: ${chosen.whyReal}`} auto={false} />
        </div>
        <p className="rounded-2xl bg-panel p-4 text-lg">
          <strong className="font-display text-nola-soft">Your urgent job: </strong>
          {chosen.urgent.text} Look for the glowing orange ring.
        </p>
        <Button onClick={onClose}>Go and do it</Button>
      </div>
    );
  } else if (state.phase === 'decision') {
    const cards = pickCards(state, unlocked);
    const intro = `Good morning! It is sol ${state.sol} of ${sols}. Pick one plan for today.`;
    title = `Sol ${state.sol}: plan your day`;
    body = (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <NolaMascot mood="happy" size={64} floating={false} className="shrink-0" />
          <div>
            <p className="text-lg">{intro}</p>
            <p className="text-base text-mist">You lose things as soon as you choose. You gain things when you finish the urgent job.</p>
          </div>
        </div>
        <div className="w-fit rounded-full bg-star">
          <ReadAloudButton text={`${intro} You lose things as soon as you choose. You gain things when you finish the urgent job.`} />
        </div>
        {tutorial && <TutorialCoach step={tutorial} />}
        {cards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {cards.map((card) => (
              <Card key={card.decisionId} card={card} onChoose={() => onPlan(card.decisionId).ok && setChosen(card)} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-lg">There is nothing you can afford to do today. Let the crew rest.</p>
            <Button onClick={onSkip}>Rest today</Button>
          </div>
        )}
      </div>
    );
  } else {
    title = `Sol ${state.sol}`;
    body = (
      <div className="space-y-4">
        {job ? (
          <p className={`flex items-start gap-2 rounded-2xl p-4 text-lg ${job.done ? 'bg-go/15' : 'bg-panel'}`}>
            {job.done ? <Check aria-hidden="true" size={22} className="mt-1 shrink-0 text-go" /> : <CircleAlert aria-hidden="true" size={22} className="mt-1 shrink-0 text-nola-soft" />}
            <span>
              <strong className="font-display">{job.done ? 'Urgent job done: ' : 'Urgent job: '}</strong>
              {job.card.urgent.text}
              {!job.done && <span className="block text-base text-mist">Go to {urgentPlace(job.card)} and press Use.</span>}
            </span>
          </p>
        ) : (
          <p className="text-lg">No plan today. The crew is resting.</p>
        )}
        {confirmEnd ? (
          <div role="alert" className="space-y-3 rounded-2xl border-2 border-alert p-4">
            <p className="text-lg">The urgent job is not done. If you end the sol now, you will not get what it gives.</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setConfirmEnd(false)}>
                Not yet
              </Button>
              <Button onClick={finish}>End the sol anyway</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => (job && !job.done ? setConfirmEnd(true) : finish())}>
              <Moon aria-hidden="true" size={20} /> End the sol
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Modal open title={title} onClose={onClose} wide>
      {body}
    </Modal>
  );
}

/** The short line in the HUD that says what to do next in the sol. */
export function solHint(save: SolSave): string {
  const { state } = save;
  if (state.status === 'complete') return 'Mission complete!';
  if (state.status === 'failed') return 'The mission is over.';
  if (state.phase === 'decision') return 'Go to the Command Console to plan your sol.';
  const job = urgentJob(save);
  if (!job) return 'No plan today. End the sol at the Command Console.';
  if (!job.done) return `Urgent: ${job.card.urgent.text}`;
  return 'Urgent job done! End the sol at the Command Console.';
}
