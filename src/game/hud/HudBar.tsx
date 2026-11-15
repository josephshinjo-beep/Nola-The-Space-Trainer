import { Apple, Droplets, Hand, Heart, Map as MapIcon, Menu, Moon, Radiation, RotateCw, Sun, Thermometer, TriangleAlert, Wind, Zap, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SIM } from '../../simulation/config';
import { isSunlit } from '../../simulation/engine';
import type { ResourceId, StationState } from '../../simulation/types';
import { ExplainButton } from '../sol/ResourceExplainer';

/**
 * The station HUD: a slim status bar at the top and a hotbar at the bottom
 * (crew vitals, the four resources as tank slots, and tool slots with their
 * keys). Every state is shown with an icon or a word as well as colour, and
 * every animation stops when "Reduce motion" is on (see index.css).
 */

const LOW = 25;
const RESOURCES: { id: ResourceId; label: string; icon: LucideIcon; system: string }[] = [
  { id: 'oxygen', label: 'Oxygen', icon: Wind, system: 'oxygen' },
  { id: 'water', label: 'Water', icon: Droplets, system: 'water' },
  { id: 'food', label: 'Food', icon: Apple, system: 'food' },
  { id: 'energy', label: 'Energy', icon: Zap, system: 'energy' },
];

const glass = 'rounded-2xl border-2 border-line bg-hull/85 shadow-[0_8px_24px_rgb(0_0_0/0.35)] backdrop-blur';

/** Returns 'up' or 'down' for a moment after a value changes by at least `step`, for a small bump animation. */
function useChange(value: number, step = 1): 'up' | 'down' | null {
  const previous = useRef(value);
  const [change, setChange] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    const delta = value - previous.current;
    if (Math.abs(delta) < step) return;
    previous.current = value;
    setChange(delta > 0 ? 'up' : 'down');
    const timer = setTimeout(() => setChange(null), 600);
    return () => clearTimeout(timer);
  }, [value, step]);
  return change;
}

/** The top status bar: station time, sunlight, temperature and radiation. */
export function StatusBar({ state }: { state: StationState }) {
  const day = Math.floor(state.minutes / 1440) + 1;
  const clock = Math.floor(state.minutes % 1440);
  const time = `${String(Math.floor(clock / 60)).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}`;
  const sunlit = isSunlit(state.minutes);
  const tempBad = state.temperature < SIM.tooCold || state.temperature > SIM.tooHot;
  const radiationHigh = state.radiation > SIM.radiationHarmLevel;
  // On phones a calm chip shows only its icon (the words stay for screen readers); a warning always shows its words.
  const chip = (bad: boolean, icon: ReactNode, text: string, iconOnlyOnPhones = false) => (
    <li className={`flex items-center gap-1.5 rounded-full px-3 py-1 compact:px-2 compact:py-0.5 ${bad ? 'animate-hud-low bg-alert/20 font-bold text-alert' : 'bg-panel/80'}`}>
      {bad ? <TriangleAlert aria-hidden="true" size={15} /> : icon}
      <span className={iconOnlyOnPhones && !bad ? 'compact:sr-only' : ''}>{text}</span>
    </li>
  );
  return (
    <section aria-label="Station status" className={`${glass} pointer-events-auto mx-auto w-fit max-w-full px-2 py-1.5 compact:px-1.5 compact:py-1`}>
      <ul className="flex flex-wrap items-center justify-center gap-1.5 text-sm font-semibold compact:gap-1 compact:text-xs">
        <li className="rounded-full bg-void/60 px-3 py-1 font-display tracking-wide compact:px-2 compact:py-0.5">
          Day {day} · {time}
        </li>
        {chip(false, sunlit ? <Sun aria-hidden="true" size={15} className="text-nola-soft" /> : <Moon aria-hidden="true" size={15} className="text-glow" />, sunlit ? 'Sunlight' : 'Shadow', true)}
        {chip(tempBad, <Thermometer aria-hidden="true" size={15} />, `${Math.round(state.temperature)} °C${tempBad ? (state.temperature > SIM.tooHot ? ' TOO HOT' : ' TOO COLD') : ''}`)}
        {chip(radiationHigh, <Radiation aria-hidden="true" size={15} />, `Radiation ${radiationHigh ? 'HIGH' : state.storm ? 'shielded' : 'normal'}`, true)}
      </ul>
    </section>
  );
}

/** Crew health: a beating heart (faster when hurt) and a bar with a trailing "damage" bar. */
function Vitals({ health }: { health: number }) {
  const value = Math.round(health);
  const low = value < 40;
  const change = useChange(value);
  const beat = value >= 60 ? '1.3s' : value >= 30 ? '0.85s' : '0.55s';
  const tone = value >= 60 ? 'bg-go' : value >= 30 ? 'bg-nola-soft' : 'bg-alert';
  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-xl px-2 py-1 compact:gap-1 compact:px-1 ${low ? 'animate-hud-low' : ''}`}>
      <Heart aria-hidden="true" size={30} className={`shrink-0 fill-current animate-heartbeat compact:h-5 compact:w-5 ${low ? 'text-alert' : 'text-nola'}`} style={{ animationDuration: beat }} />
      <div className="w-28 sm:w-36 compact:w-14">
        <p className="flex items-baseline justify-between gap-1 whitespace-nowrap text-xs font-bold uppercase tracking-wider text-mist">
          <span className="compact:sr-only">Crew</span>
          <span className={`font-display text-base tracking-normal compact:text-sm ${low ? 'text-alert' : 'text-star'} ${change ? 'animate-hud-bump inline-block' : ''}`}>{value}%</span>
        </p>
        <div className="relative mt-1 h-3 overflow-hidden rounded-full border border-line bg-void compact:mt-0.5 compact:h-2" aria-hidden="true">
          {/* The pale bar trails behind, so a loss stays visible for a moment. */}
          <div className="absolute inset-y-0 left-0 bg-star/40 transition-[width] delay-300 duration-1000" style={{ width: `${value}%` }} />
          <div className={`absolute inset-y-0 left-0 ${tone} transition-[width] duration-300`} style={{ width: `${value}%` }} />
        </div>
        {low && <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-alert compact:hidden">Low: crew needs care</p>}
      </div>
    </div>
  );
}

/** One resource as a tank slot that fills from the bottom. */
function ResourceSlot({ state, id, label, icon: Icon, system }: (typeof RESOURCES)[number] & { state: StationState }) {
  const value = Math.round(state.resources[id]);
  const auto = !state.unlocked.includes(system as never);
  const low = !auto && value < LOW;
  const change = useChange(value);
  return (
    <li className="relative">
      <div
        className={`relative flex h-14 w-12 flex-col items-center justify-end overflow-hidden rounded-xl border-2 bg-void/80 pb-1 sm:h-16 sm:w-14 compact:h-11 compact:w-9 compact:rounded-lg ${low ? 'animate-hud-low border-alert' : auto ? 'border-line opacity-70' : 'border-line'} ${change ? 'animate-hud-bump' : ''}`}
      >
        {/* The fill rises and falls smoothly, like the level in a tank. */}
        <div
          aria-hidden="true"
          className={`absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out ${auto ? 'bg-line/60' : low ? 'bg-alert/45' : 'bg-glow/35'}`}
          style={{ height: `${auto ? 100 : value}%`, backgroundImage: low ? 'repeating-linear-gradient(45deg, transparent 0 4px, rgb(0 0 0 / 0.3) 4px 8px)' : undefined }}
        />
        <Icon aria-hidden="true" size={18} className={`relative mb-auto mt-1.5 compact:mt-1 compact:h-3.5 compact:w-3.5 ${low ? 'text-alert' : 'text-star'}`} />
        <span className={`relative font-display text-sm font-semibold leading-none compact:text-[11px] ${low ? 'text-alert' : ''}`}>{auto ? 'Auto' : `${value}%`}</span>
        {low && <span className="relative mt-0.5 text-[10px] font-bold leading-none text-alert compact:hidden">LOW</span>}
      </div>
      <span className="sr-only">
        {label}: {auto ? 'looked after by NOLA (locked)' : `${value}%${low ? ', low' : ''}`}
      </span>
      <span className="absolute -right-1.5 -top-1.5 hidden sm:block compact:hidden">
        <ExplainButton resource={id === 'energy' ? 'power' : id} className="h-5 w-5 border bg-hull" />
      </span>
    </li>
  );
}

/** A tool slot: an action button with its keyboard key shown on a key cap. */
function ToolSlot({ label, keyCap, icon: Icon, onPress, disabled = false, className = '' }: { label: string; keyCap: string; icon: LucideIcon; onPress: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      disabled={disabled}
      className={`pointer-events-auto relative flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-line bg-panel/90 text-xs font-bold transition hover:-translate-y-0.5 hover:border-glow active:scale-95 disabled:opacity-45 disabled:hover:translate-y-0 sm:h-16 sm:w-16 compact:h-11 compact:w-10 compact:rounded-lg ${className}`}
    >
      <Icon aria-hidden="true" size={20} />
      <span aria-hidden="true" className="compact:hidden">{label}</span>
      <kbd aria-hidden="true" className="absolute -bottom-2 rounded-md border border-line bg-void px-1.5 font-display text-[10px] leading-4 text-glow [@media(pointer:coarse)]:hidden">
        {keyCap}
      </kbd>
    </button>
  );
}

interface HotbarProps {
  state: StationState;
  nearbyName: string | null;
  onMap: () => void;
  onUse: () => void;
  onMenu: () => void;
  /** Only in the 3D view: turn the camera. */
  onTurn?: () => void;
}

/** The bottom hotbar: crew vitals, the four resource tanks and the tool slots. */
export function Hotbar({ state, nearbyName, onMap, onUse, onMenu, onTurn }: HotbarProps) {
  return (
    <section aria-label="Station resources" className={`${glass} pointer-events-auto mx-auto flex w-fit max-w-full animate-slide-up flex-wrap items-center justify-center gap-x-3 gap-y-2 px-2 pb-3 pt-2 sm:px-3 compact:flex-nowrap compact:gap-x-1.5 compact:px-1.5 compact:py-1.5`}>
      <Vitals health={state.health} />
      <ul className="flex gap-1.5 sm:gap-2 compact:gap-1">
        {RESOURCES.map((resource) => (
          <ResourceSlot key={resource.id} state={state} {...resource} />
        ))}
      </ul>
      <div className="h-10 w-px bg-line compact:hidden" aria-hidden="true" />
      <div className="flex gap-1.5 sm:gap-2 compact:gap-1">
        <ToolSlot label="Map" keyCap="M" icon={MapIcon} onPress={onMap} />
        {/* The big round Use button covers touch screens; this slot is for keyboard and mouse. */}
        <ToolSlot label="Use" keyCap="E" icon={Hand} onPress={onUse} disabled={!nearbyName} className="[@media(pointer:coarse)]:hidden" />
        {onTurn && <ToolSlot label="Turn" keyCap="Q/R" icon={RotateCw} onPress={onTurn} />}
        <ToolSlot label="Menu" keyCap="Esc" icon={Menu} onPress={onMenu} />
      </div>
    </section>
  );
}
