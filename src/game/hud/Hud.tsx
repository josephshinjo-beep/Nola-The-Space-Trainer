import { Check, ChevronDown, ChevronUp, Hand, Lock } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link } from 'react-router';
import { NolaMascot } from '../../features/companion/NolaMascot';
import { moduleForSystem } from '../../features/unlocks/unlockManager';
import { currentMission, MISSIONS } from '../../simulation/missions';
import type { LogTone, StationState } from '../../simulation/types';
import type { GameBridge } from '../GameBridge';
import { isCompactScreen, useCompact } from './useCompact';

const panel = 'rounded-2xl border-2 border-line bg-hull/90 backdrop-blur';

/** The current mission and its tasks: progress, the next task highlighted, and a tick that pops when a task is done. */
export function MissionPanel({ state }: { state: StationState }) {
  // Starts folded on phones so it does not cover the station.
  const [open, setOpen] = useState(() => !isCompactScreen());
  const mission = currentMission(state);
  const nextLocked = MISSIONS.find((candidate) => !state.unlocked.includes(candidate.system));
  const nextModule = nextLocked ? moduleForSystem(nextLocked.system) : undefined;
  const done = mission ? mission.tasks.filter((task) => state.completedTasks.includes(task.id)).length : 0;
  const total = mission?.tasks.length ?? 0;
  const next = mission?.tasks.find((task) => !state.completedTasks.includes(task.id));
  const number = mission ? MISSIONS.indexOf(mission) + 1 : MISSIONS.length;

  return (
    <section aria-label="Mission" className={`${panel} pointer-events-auto w-60 max-w-[64vw] overflow-hidden p-0 sm:w-72 sm:max-w-[78vw] compact:w-52 compact:max-w-[58vw]`}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 px-3 pb-2 pt-3 text-left compact:px-2.5 compact:pb-1.5 compact:pt-2">
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-widest text-nola-soft compact:text-[10px]">
            {mission ? `Mission ${number} of ${MISSIONS.length}` : 'Missions'}
          </span>
          <span className="block font-display text-lg font-semibold leading-tight compact:truncate compact:text-sm">{mission ? mission.title : 'All clear'}</span>
        </span>
        <span className="flex items-center gap-2">
          {mission && (
            <span className="rounded-full bg-panel px-2 py-0.5 font-display text-sm">
              {done}/{total}
            </span>
          )}
          {open ? <ChevronUp aria-hidden="true" size={20} /> : <ChevronDown aria-hidden="true" size={20} />}
        </span>
      </button>
      {mission && (
        <div className="mx-3 mb-2 h-1.5 overflow-hidden rounded-full bg-void" role="progressbar" aria-label="Mission progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
          <div className="h-full rounded-full bg-gradient-to-r from-nola to-nola-soft transition-[width] duration-700 ease-out" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      )}
      {open &&
        (mission ? (
          <ol className="space-y-1 px-2 pb-3">
            {mission.tasks.map((task, index) => {
              const isDone = state.completedTasks.includes(task.id);
              const isNext = task === next;
              return (
                <li
                  key={task.id}
                  className={`flex gap-2 rounded-xl px-2 py-1.5 text-sm transition-colors ${isNext ? 'border-l-4 border-nola bg-nola/10' : 'border-l-4 border-transparent'}`}
                >
                  {isDone ? (
                    <span key="done" className="mt-0.5 flex h-5 w-5 shrink-0 animate-tick-pop items-center justify-center rounded-full bg-go text-void">
                      <Check aria-hidden="true" size={14} strokeWidth={3} />
                    </span>
                  ) : (
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 font-display text-[11px] ${isNext ? 'border-nola text-nola-soft' : 'border-line text-mist'}`}>{index + 1}</span>
                  )}
                  <span className={`min-w-0 ${isDone ? 'text-mist line-through' : ''}`}>
                    <span className="sr-only">{isDone ? 'Done: ' : isNext ? 'Next: ' : 'To do: '}</span>
                    {task.label}
                    {isNext && <span className="ml-2 rounded-full bg-nola px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-void">Next</span>}
                    {!isDone && <span className="block text-xs text-mist">{task.hint}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="px-3 pb-3 text-sm text-mist">
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
  const compact = useCompact();
  // On phones each message shows for a few seconds and then gets out of the way (warnings stay).
  const [hiddenEntry, setHiddenEntry] = useState<unknown>(null);
  useEffect(() => {
    if (!compact || !entry || entry.tone === 'warn' || entry.tone === 'danger') return;
    const timer = window.setTimeout(() => setHiddenEntry(entry), 6000);
    return () => window.clearTimeout(timer);
  }, [compact, entry]);
  if (!entry || (compact && hiddenEntry === entry)) return null;
  return (
    <div className={`pointer-events-auto flex w-fit max-w-xl items-center gap-2 rounded-2xl border-2 bg-star px-3 py-2 text-void shadow-xl compact:max-w-[24rem] compact:gap-1.5 compact:px-2 compact:py-1 ${TONE_STYLE[entry.tone]}`}>
      <NolaMascot size={44} floating={false} mood={entry.tone === 'good' ? 'excited' : entry.tone === 'info' ? 'happy' : 'curious'} className="shrink-0 compact:hidden" />
      <p aria-live="polite" className="text-sm font-semibold sm:text-base compact:text-xs">
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
      className="pointer-events-auto flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-void bg-nola compact:h-20 compact:w-20 compact:text-xs text-center font-display text-sm font-bold leading-tight text-void shadow-xl transition active:scale-95 disabled:bg-panel disabled:text-mist"
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
  const [knob, setKnob] = useState({ x: 0, y: 0, travel: 36 });

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
    // The bridge is the game's input channel: writing to it is how the joystick talks to Phaser.
    // oxlint-disable-next-line react/immutability
    bridge.input = { x, y };
    // How far the knob may move follows the pad's size (it is smaller on phones).
    setKnob({ x, y, travel: radius * 0.56 });
  }

  function release() {
    // oxlint-disable-next-line react/immutability
    bridge.input = { x: 0, y: 0 };
    setKnob((old) => ({ ...old, x: 0, y: 0 }));
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
      className="pointer-events-auto relative h-32 w-32 touch-none rounded-full border-4 border-line bg-hull/70 compact:h-24 compact:w-24"
    >
      <div className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border-4 border-void bg-glow compact:h-10 compact:w-10" style={{ transform: `translate(calc(-50% + ${knob.x * knob.travel}px), calc(-50% + ${knob.y * knob.travel}px))` }} />
    </div>
  );
}
