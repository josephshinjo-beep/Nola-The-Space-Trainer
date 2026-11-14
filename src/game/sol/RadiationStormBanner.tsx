import { CircleAlert, ExternalLink, Radiation, ShieldPlus, Tent, X } from 'lucide-react';
import { describeEvent, eventDate } from '../../data/spaceEvents';
import { stormChoiceCost, stormHarm, whyNotStormChoice } from '../../sol/engine';
import type { Resource } from '../../sol/config';
import type { RadiationStorm, SolState, StormChoice } from '../../sol/types';
import { RESOURCE_LABELS } from './cards';

const SEVERITY_NAMES = { 1: 'Strong', 2: 'Severe', 3: 'Extreme' } as const;

/** "2 min 05 s" from station minutes left (the station clock runs 2 minutes per real second). */
export function countdownText(stationMinutesLeft: number, minutesPerRealSecond: number): string {
  const seconds = Math.max(0, Math.ceil(stationMinutesLeft / minutesPerRealSecond));
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes} min ${String(seconds % 60).padStart(2, '0')} s` : `${seconds} s`;
}

/** "Power −16, Water −20" in kid words. */
export function costText(choice: StormChoice, severity: number): string {
  return (Object.entries(stormChoiceCost(choice, severity)) as [Resource, number][]).map(([resource, amount]) => `${RESOURCE_LABELS[resource].name} −${amount}`).join(', ');
}

/** The message after the storm passes. */
export function stormResultText(storm: RadiationStorm): string {
  const harm = stormHarm(storm.choice, storm.severity);
  if (storm.choice === 'shelter') return 'The storm has passed. The crew stayed safe in the shelter.';
  if (storm.choice === 'reinforce') return `The storm has passed. The stronger shield blocked most of it (crew health −${harm}).`;
  return `The storm hit and the crew was not protected (crew health −${harm}). Next time, choose a way to stay safe!`;
}

interface Props {
  state: SolState;
  storm: RadiationStorm;
  stationMinutesLeft: number;
  minutesPerRealSecond: number;
  onChoose: (choice: StormChoice) => void;
}

/**
 * The radiation storm warning shown over the game. The event it is based on
 * is real (NASA DONKI); the storm itself is a game mechanic.
 */
export function RadiationStormBanner({ state, storm, stationMinutesLeft, minutesPerRealSecond, onChoose }: Props) {
  const event = { ...storm.event, severity: storm.severity };
  const choices: { id: StormChoice; label: string; icon: typeof ShieldPlus; why: string }[] = [
    { id: 'reinforce', label: 'Reinforce shielding', icon: ShieldPlus, why: 'Pump water into the walls and power up the shield.' },
    { id: 'shelter', label: 'Shelter the crew', icon: Tent, why: 'Everyone waits in the storm shelter, so research stops.' },
  ];

  return (
    <section aria-labelledby="storm-title" className="pointer-events-auto w-full max-w-[26rem] rounded-2xl border-2 border-nola bg-hull/95 p-3 backdrop-blur">
      <div className="flex items-start gap-2">
        <Radiation aria-hidden="true" size={28} className="shrink-0 text-nola-soft motion-safe:animate-pulse" />
        <div className="min-w-0 flex-1">
          <h2 id="storm-title" className="font-display text-lg font-semibold leading-tight">
            Radiation Storm: {SEVERITY_NAMES[storm.severity]}
          </h2>
          <p className="text-sm font-bold text-nola-soft" role="timer" aria-live="off">
            Arrives in {countdownText(stationMinutesLeft, minutesPerRealSecond)}
          </p>
        </div>
      </div>

      <p className="mt-2 text-sm">
        Based on a real solar event from <strong>{eventDate(event)}</strong>: {describeEvent(event)}.
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-mist">
        <span className="rounded-full bg-panel px-2 py-0.5 font-bold">{storm.live ? 'Live NASA data' : 'Saved NASA data'}</span>
        <span>Game mechanic, not a radiation forecast.</span>
        {storm.event.link && (
          <a href={storm.event.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-nola-soft underline">
            See it at NASA <ExternalLink aria-hidden="true" size={12} />
          </a>
        )}
      </p>

      {storm.choice ? (
        <p role="status" className="mt-3 rounded-xl bg-go/15 p-2 text-sm font-semibold text-go">
          {storm.choice === 'reinforce' ? 'Shield reinforced. The crew is ready.' : 'The crew is safe in the shelter.'}
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm font-semibold">Choose how to keep the crew safe:</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {choices.map((choice) => {
              const reason = whyNotStormChoice(state, choice.id);
              const Icon = choice.icon;
              return (
                <div key={choice.id} className="flex flex-col">
                  <button
                    type="button"
                    disabled={reason !== null}
                    aria-describedby={`storm-${choice.id}-why`}
                    onClick={() => onChoose(choice.id)}
                    className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-nola bg-panel px-3 py-2 text-left font-bold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon aria-hidden="true" size={20} className="shrink-0" />
                    <span>
                      {choice.label}
                      <span className="block text-xs font-semibold text-alert">{costText(choice.id, storm.severity)}</span>
                    </span>
                  </button>
                  <span id={`storm-${choice.id}-why`} className="mt-1 text-xs text-mist">
                    {reason ? (
                      <span className="inline-flex items-center gap-1 text-alert">
                        <X aria-hidden="true" size={12} /> {reason}
                      </span>
                    ) : (
                      choice.why
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-nola-soft">
            <CircleAlert aria-hidden="true" size={14} /> If you do nothing, the crew loses {stormHarm(null, storm.severity)} health.
          </p>
        </>
      )}
    </section>
  );
}
