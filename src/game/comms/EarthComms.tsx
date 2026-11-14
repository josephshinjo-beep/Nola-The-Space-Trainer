import { Check, Clock, Moon, Orbit, Radio, Satellite, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/Button';
import { MISTAKE_RESOURCE } from '../../simulation/engine';
import type { Action, ActionResult, FaultId, ResourceId, SiteId, StationState } from '../../simulation/types';
import { EQUIPMENT } from '../stationMap';
import { RepairGame } from '../hud/MiniGames';
import { callProgress, findCall, lostWhileWaiting, planCall, speedText } from './comms';
import { formatClock, formatDelay, siteLink } from './delay';
import { PROCEDURES } from './procedures';

type Dispatch = (action: Action) => ActionResult;

const RESOURCE_NAMES: Record<ResourceId, string> = { oxygen: 'oxygen', water: 'water', food: 'food', energy: 'power' };

const millionKm = (km: number) => (km >= 1e6 ? `${Math.round(km / 1e6)} million km` : `${km.toLocaleString('en')} km`);

/** Choosing where the base is. Shows each site's real signal delay. */
export function SitePicker({ state, dispatch, onMessage }: { state: StationState; dispatch: Dispatch; onMessage?: (text: string) => void }) {
  const links = useMemo(() => ({ moon: siteLink('moon'), mars: siteLink('mars') }), []);
  const sites: { id: SiteId; icon: typeof Moon; extra: string }[] = [
    { id: 'moon', icon: Moon, extra: 'Close to home: Mission Control can help almost at once.' },
    { id: 'mars', icon: Orbit, extra: 'Mars and Earth move around the Sun, so the delay changes from about 3 to 22 minutes. This is today’s value.' },
  ];
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 font-display text-lg font-semibold">Where is your base?</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {sites.map(({ id, icon: Icon, extra }) => {
          const link = links[id];
          const chosen = state.site === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={chosen}
              onClick={() => {
                const result = dispatch({ type: 'chooseSite', site: id });
                onMessage?.(result.message);
              }}
              className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left ${chosen ? 'border-go bg-go/10' : 'border-line bg-void/60 hover:border-glow'}`}
            >
              <span className="flex items-center gap-2 font-display text-lg font-semibold">
                <Icon aria-hidden="true" size={22} /> {link.name} {chosen && <Check aria-label="(chosen)" size={18} className="text-go" />}
              </span>
              <span className="text-base">
                Signal to Earth: <strong className="text-glow">{formatDelay(link.oneWaySeconds)}</strong> each way
              </span>
              <span className="text-sm text-mist">
                {millionKm(link.km)} away. {extra}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * What to do about a problem: ask Mission Control (and wait for the reply
 * while the problem drains the station), or act now on your own training.
 */
export function FaultResponse({ fault, state, dispatch, onSent, onRepaired }: { fault: FaultId; state: StationState; dispatch: Dispatch; onSent: (text: string) => void; onRepaired: (text: string) => void }) {
  const procedure = PROCEDURES[fault];
  const call = findCall(state, fault);
  const [acting, setActing] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState('');
  const link = useMemo(() => (state.site ? siteLink(state.site) : null), [state.site]);
  const noSignal = state.faults.includes('antenna');
  const resourceName = RESOURCE_NAMES[MISTAKE_RESOURCE[fault]];

  if (solved) {
    return (
      <div className="space-y-3">
        <p className="rounded-2xl border-2 border-go bg-go/10 p-3 text-lg font-semibold">Right call! Now do the repair.</p>
        <RepairGame fault={fault} onWin={() => onRepaired(dispatch({ type: 'repair', fault }).message)} />
      </div>
    );
  }

  const earthAnswered = call?.replied === true;
  const askBox = (() => {
    if (fault === 'antenna' || noSignal) {
      return (
        <p className="flex items-start gap-2 text-base">
          <X aria-hidden="true" size={18} className="mt-1 shrink-0 text-alert" /> No signal: the antenna is not pointing at Earth, so Mission Control cannot hear you. You must use your training.
        </p>
      );
    }
    if (call && !call.replied) {
      const progress = callProgress(call, state.minutes);
      return (
        <p className="text-base">
          Message sent. Reply due in <strong className="font-display text-glow">{formatClock(progress.realSecondsLeft)}</strong> of real delay. Close this panel to let time pass (the clock stops while a panel is open).
        </p>
      );
    }
    if (earthAnswered) return <p className="rounded-xl bg-glow/15 p-2 text-base font-semibold">{procedure.earthReply}</p>;
    if (!state.site) return <SitePicker state={state} dispatch={dispatch} />;
    const plan = planCall(link!.oneWaySeconds);
    return (
      <>
        <dl className="text-base">
          <div className="flex justify-between gap-2"><dt className="text-mist">Signal to Earth (real)</dt><dd className="font-semibold">{formatDelay(link!.oneWaySeconds)} each way</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-mist">Reply arrives after (real)</dt><dd className="font-semibold">{formatDelay(plan.realRoundTripSeconds)}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-mist">Your wait in the game</dt><dd className="font-semibold">{formatDelay(plan.playSecondsLeft)}, {speedText(plan.speedUp)}</dd></div>
        </dl>
        <p className="text-sm text-mist">While you wait, the problem keeps going and {resourceName} can drain.</p>
        <Button
          onClick={() => {
            const result = dispatch({ type: 'askEarth', fault, oneWaySeconds: link!.oneWaySeconds });
            if (result.ok) onSent(`Message sent to Mission Control from ${link!.name}. Watch the reply clock in the Message to Earth box.`);
            else setMessage(result.message);
          }}
        >
          <Radio aria-hidden="true" size={18} /> Send the message
        </Button>
      </>
    );
  })();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <section aria-labelledby="ask-earth" className="space-y-2 rounded-2xl border-2 border-line bg-void/60 p-3">
          <h3 id="ask-earth" className="flex items-center gap-2 font-display text-lg font-semibold">
            <Satellite aria-hidden="true" size={20} /> Ask Mission Control
          </h3>
          {askBox}
        </section>
        <section aria-labelledby="act-now" className="space-y-2 rounded-2xl border-2 border-line bg-void/60 p-3">
          <h3 id="act-now" className="flex items-center gap-2 font-display text-lg font-semibold">
            <Clock aria-hidden="true" size={20} /> Act now on your training
          </h3>
          <p className="text-base">No waiting. Remember what you learned in {procedure.moduleTitle}. A wrong step wastes some {resourceName}.</p>
          {!acting && <Button variant="secondary" onClick={() => setActing(true)}>I know what to do</Button>}
        </section>
      </div>

      {(acting || earthAnswered) && (
        <section aria-labelledby="training-question" className="space-y-2 rounded-2xl border-2 border-nola p-3">
          <h3 id="training-question" className="font-display text-lg font-semibold">{procedure.question}</h3>
          <div className="grid gap-2">
            {procedure.options.map((option, index) => {
              const shown = picked === index;
              return (
                <button
                  key={option.text}
                  type="button"
                  onClick={() => {
                    setPicked(index);
                    if (option.correct) setSolved(true);
                    else setMessage(dispatch({ type: 'trainingMistake', fault }).message);
                  }}
                  className={`rounded-xl border-2 p-3 text-left text-base font-semibold ${shown && !option.correct ? 'border-alert bg-alert/10' : earthAnswered && option.correct ? 'border-glow bg-glow/10' : 'border-line bg-void/60 hover:border-glow'}`}
                >
                  {option.text}
                  {earthAnswered && option.correct && <span className="ml-2 text-sm text-glow">(Mission Control’s advice)</span>}
                  {shown && !option.correct && <span className="mt-1 block text-sm font-normal text-alert">{option.why}</span>}
                </button>
              );
            })}
          </div>
        </section>
      )}
      <p role="status" className="min-h-6 text-base font-semibold text-nola-soft">{message}</p>
      <p className="rounded-2xl border-2 border-line bg-void/50 p-3 text-base">
        <span className="mr-2 inline-block rounded-full bg-glow px-3 py-0.5 text-sm font-bold text-void">Real science</span>
        Radio travels at the speed of light, about 300,000 km every second. Earth can talk to the Moon almost live, but a crew on Mars waits up to 44 minutes for an answer, so they train to solve problems on their own.
      </p>
    </div>
  );
}

/** The HUD box for messages to and from Earth, with the real delay counting down. */
export function EarthLinkPanel({ state }: { state: StationState }) {
  if (state.earthCalls.length === 0 || !state.site) return null;
  const link = siteLink(state.site);
  return (
    <section aria-label="Message to Earth" className="pointer-events-auto w-64 max-w-[70vw] space-y-2 rounded-2xl border-2 border-glow bg-hull/90 p-3 backdrop-blur">
      <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-glow">
        <Radio aria-hidden="true" size={14} /> Message to Earth · {link.name}
      </p>
      {state.earthCalls.map((call) => {
        const progress = callProgress(call, state.minutes);
        const { resource, lost } = lostWhileWaiting(call, state);
        const where = EQUIPMENT.find((item) => item.faults.includes(call.fault))?.name ?? 'the machine';
        return (
          <div key={call.fault} className="space-y-1 text-sm">
            <p>
              Signal: <strong>{formatDelay(call.oneWaySeconds)}</strong> each way (real)
            </p>
            {call.replied ? (
              <>
                <p className="font-semibold text-go">Reply received!</p>
                <p>{PROCEDURES[call.fault].earthReply}</p>
                <p className="text-mist">Go to the {where} to fix it.</p>
              </>
            ) : (
              <>
                <p className="flex items-baseline justify-between gap-2">
                  <span>Reply in</span>
                  <strong role="timer" aria-live="off" className="font-display text-2xl text-glow">
                    {formatClock(progress.realSecondsLeft)}
                  </strong>
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-void" aria-hidden="true">
                  <div className="h-full bg-glow" style={{ width: `${Math.round(progress.share * 100)}%` }} />
                </div>
                <p className="text-xs text-mist">Real delay shown. The game plays the wait {speedText(progress.speedUp)}.</p>
                {state.faults.includes('antenna') && <p className="text-xs font-semibold text-alert">No signal! Fix the antenna or the reply cannot arrive.</p>}
              </>
            )}
            {lost > 0.05 && (
              <p className="text-xs font-semibold text-alert">
                Lost while waiting: {RESOURCE_NAMES[resource]} −{lost.toFixed(1)}%
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}
