import { Apple, Check, ChevronDown, ChevronUp, Circle, Droplets, Hand, Heart, Lock, Moon, Radiation, Sun, Thermometer, Wind, Zap, type LucideIcon } from 'lucide-react';
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router';
import { NolaMascot } from '../../features/companion/NolaMascot';
import { moduleForSystem } from '../../features/unlocks/unlockManager';
import { SIM } from '../../simulation/config';
import { isSunlit } from '../../simulation/engine';
import { currentMission, MISSIONS } from '../../simulation/missions';
import type { LogTone, ResourceId, StationState } from '../../simulation/types';
import type { GameBridge } from '../GameBridge';
import { ExplainButton } from '../sol/ResourceExplainer';

const RESOURCES: { id: ResourceId; label: string; icon: LucideIcon }[] = [
  { id: 'oxygen', label: 'Oxygen', icon: Wind },
  { id: 'water', label: 'Water', icon: Droplets },
  { id: 'food', label: 'Food', icon: Apple },
  { id: 'energy', label: 'Energy', icon: Zap },
];
const RESOURCE_SYSTEM = { oxygen: 'oxygen', water: 'water', food: 'food', energy: 'energy' } as const;

const panel = 'rounded-2xl border-2 border-line bg-hull/90 backdrop-blur';

/** Resource bars and station readings. Low levels show the word LOW, not just a colour. */
export function ResourceStrip({ state }: { state: StationState }) {
  const day = Math.floor(state.minutes / 1440) + 1;
  const clock = Math.floor(state.minutes % 1440);
  const time = `${String(Math.floor(clock / 60)).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}`;
  const tempBad = state.temperature < SIM.tooCold || state.temperature > SIM.tooHot;
  const radiationHigh = state.radiation > SIM.radiationHarmLevel;
  const sunlit = isSunlit(state.minutes);

  return (
    <section aria-label="Station resources" className={`${panel} pointer-events-auto p-2 sm:p-3`}>
      <ul className="grid grid-cols-4 gap-2 sm:gap-3">
        {RESOURCES.map(({ id, label, icon: Icon }) => {
          const value = Math.round(state.resources[id]);
          const auto = !state.unlocked.includes(RESOURCE_SYSTEM[id]);
          const low = !auto && value < 25;
          return (
            <li key={id} className="min-w-0">
              <div className="flex items-center justify-between gap-1 text-xs font-bold sm:text-sm">
                <span className="flex min-w-0 items-center gap-1">
                  <Icon aria-hidden="true" size={16} className={`shrink-0 ${low ? 'text-alert' : 'text-glow'}`} />
                  <span className="sr-only sm:not-sr-only sm:truncate">{label}</span>
                  <ExplainButton resource={id === 'energy' ? 'power' : id} className="hidden h-5 w-5 border-0 sm:inline-flex" />
                </span>
                <span className={`whitespace-nowrap ${low ? 'text-alert' : ''}`}>{auto ? 'Auto' : `${value}%${low ? ' LOW' : ''}`}</span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full border border-line bg-void" aria-hidden="true">
                <div
                  className={`h-full ${auto ? 'bg-line' : low ? 'bg-alert' : 'bg-glow'}`}
                  style={{ width: `${value}%`, backgroundImage: low ? 'repeating-linear-gradient(45deg, transparent 0 4px, rgb(0 0 0 / 0.35) 4px 8px)' : undefined }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold sm:text-sm">
        <li className={`flex items-center gap-1 ${state.health < 40 ? 'text-alert' : ''}`}>
          <Heart aria-hidden="true" size={15} /> Crew {Math.round(state.health)}%{state.health < 40 ? ' LOW' : ''}
        </li>
        <li className={`flex items-center gap-1 ${tempBad ? 'text-alert' : ''}`}>
          <Thermometer aria-hidden="true" size={15} /> {Math.round(state.temperature)} °C{tempBad ? (state.temperature > SIM.tooHot ? ' TOO HOT' : ' TOO COLD') : ''}
        </li>
        <li className={`flex items-center gap-1 ${radiationHigh ? 'text-alert' : ''}`}>
          <Radiation aria-hidden="true" size={15} /> Radiation {radiationHigh ? 'HIGH' : state.storm ? 'shielded' : 'normal'}
        </li>
        <li className="flex items-center gap-1 text-mist">
          {sunlit ? <Sun aria-hidden="true" size={15} /> : <Moon aria-hidden="true" size={15} />} {sunlit ? 'Sunlight' : 'Shadow'}
        </li>
        <li className="text-mist">
          Day {day}, {time}
        </li>
      </ul>
    </section>
  );
}

/** The current mission and its tasks. */
export function MissionPanel({ state }: { state: StationState }) {
  // Starts folded on small screens so it does not cover the station.
  const [open, setOpen] = useState(() => window.innerWidth >= 640);
  const mission = currentMission(state);
  const nextLocked = MISSIONS.find((candidate) => !state.unlocked.includes(candidate.system));
  const nextModule = nextLocked ? moduleForSystem(nextLocked.system) : undefined;

  return (
    <section aria-label="Mission" className={`${panel} pointer-events-auto w-64 max-w-[70vw] p-3`}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 text-left">
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-widest text-nola-soft">{mission ? 'Mission' : 'Missions'}</span>
          <span className="block font-display text-lg font-semibold leading-tight">{mission ? mission.title : 'All clear'}</span>
        </span>
        {open ? <ChevronUp aria-hidden="true" size={20} /> : <ChevronDown aria-hidden="true" size={20} />}
      </button>
      {open &&
        (mission ? (
          <ul className="mt-2 space-y-2">
            {mission.tasks.map((task) => {
              const done = state.completedTasks.includes(task.id);
              return (
                <li key={task.id} className="flex gap-2 text-sm">
                  {done ? <Check aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-go" /> : <Circle aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-mist" />}
                  <span className={done ? 'text-mist line-through' : ''}>
                    <span className="sr-only">{done ? 'Done: ' : 'To do: '}</span>
                    {task.label}
                    {!done && <span className="block text-xs text-mist">{task.hint}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-mist">
            {nextModule ? (
              <>
                <Lock aria-hidden="true" size={14} className="mr-1 inline" />
                Pass{' '}
                <Link to={`/academy/${nextModule.id}`} className="font-bold text-glow underline">
                  Module {nextModule.number}
                </Link>{' '}
                to unlock your next mission. Until then, keep the station running!
              </>
            ) : (
              'Every mission is complete. Keep your station running, commander!'
            )}
          </p>
        ))}
    </section>
  );
}

const TONE_STYLE: Record<LogTone, string> = {
  info: 'border-line',
  good: 'border-go',
  warn: 'border-nola',
  danger: 'border-alert',
};
const TONE_WORD: Record<LogTone, string> = { info: '', good: '', warn: 'Warning: ', danger: 'Danger: ' };

/** NOLA's latest message, shown as a caption so nothing depends on sound. */
export function NolaCaption({ state }: { state: StationState }) {
  const entry = state.log.at(-1);
  if (!entry) return null;
  return (
    <div className={`pointer-events-auto flex w-fit max-w-xl items-center gap-2 rounded-2xl border-2 bg-star px-3 py-2 text-void shadow-xl ${TONE_STYLE[entry.tone]}`}>
      <NolaMascot size={44} floating={false} mood={entry.tone === 'good' ? 'excited' : entry.tone === 'info' ? 'happy' : 'curious'} className="shrink-0" />
      <p aria-live="polite" className="text-sm font-semibold sm:text-base">
        <span className="sr-only">NOLA says: </span>
        <strong>{TONE_WORD[entry.tone]}</strong>
        {entry.text}
      </p>
    </div>
  );
}

/** The on-screen "use" button for touch screens (and anyone who prefers it to the E key). */
export function InteractButton({ label, onPress }: { label: string | null; onPress: () => void }) {
  return (
    <button
      type="button"
      disabled={!label}
      onClick={onPress}
      className="pointer-events-auto flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-void bg-nola text-center font-display text-sm font-bold leading-tight text-void shadow-xl transition active:scale-95 disabled:bg-panel disabled:text-mist"
    >
      <Hand aria-hidden="true" size={26} />
      {label ? 'Use' : 'Nothing nearby'}
      <span className="sr-only">{label ? `: ${label}` : ''}</span>
    </button>
  );
}

/** A touch joystick. It writes the direction straight to the game bridge. */
export function Joystick({ bridge }: { bridge: GameBridge }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  function move(event: ReactPointerEvent) {
    const box = base.current?.getBoundingClientRect();
    if (!box) return;
    const radius = box.width / 2;
    let x = (event.clientX - box.left - radius) / radius;
    let y = (event.clientY - box.top - radius) / radius;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    bridge.input = { x, y };
    setKnob({ x, y });
  }

  function release() {
    bridge.input = { x: 0, y: 0 };
    setKnob({ x: 0, y: 0 });
  }

  return (
    <div
      ref={base}
      aria-hidden="true"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={(event) => event.buttons > 0 && move(event)}
      onPointerUp={release}
      onPointerCancel={release}
      className="pointer-events-auto relative h-32 w-32 touch-none rounded-full border-4 border-line bg-hull/70"
    >
      <div className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border-4 border-void bg-glow" style={{ transform: `translate(calc(-50% + ${knob.x * 36}px), calc(-50% + ${knob.y * 36}px))` }} />
    </div>
  );
}
