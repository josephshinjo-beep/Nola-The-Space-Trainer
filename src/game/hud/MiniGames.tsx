import { Check, Droplet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { useSettings } from '../../features/accessibility/SettingsContext';
import type { FaultId } from '../../simulation/types';

interface GameProps {
  onWin: () => void;
}

/**
 * Timing game: stop the moving marker inside the target zone, three times.
 * With "Reduce motion" on, it becomes a no-rush version: set a dial to the
 * target number.
 */
function AlignGame({ onWin, noun }: GameProps & { noun: string }) {
  const { settings } = useSettings();
  const zones = [0.5, 0.28, 0.72];
  const [round, setRound] = useState(0);
  const [message, setMessage] = useState(`Stop the marker inside the target zone to align the ${noun}.`);
  const [dial, setDial] = useState(0);
  const position = useRef(0);
  const marker = useRef<HTMLDivElement>(null);
  const zone = zones[round] ?? 0.5;
  const halfWidth = 0.13;

  useEffect(() => {
    if (settings.reduceMotion) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      // Slides back and forth across the bar once every 3 seconds.
      const phase = ((now - start) / 3000) % 1;
      position.current = phase < 0.5 ? phase * 2 : 2 - phase * 2;
      if (marker.current) marker.current.style.left = `${position.current * 100}%`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [settings.reduceMotion, round]);

  function attempt(value: number) {
    if (Math.abs(value - zone) <= halfWidth) {
      if (round + 1 >= zones.length) onWin();
      else {
        setRound(round + 1);
        setMessage(`Locked! ${zones.length - round - 1} more to go.`);
      }
    } else {
      setMessage(value < zone ? 'Missed: too far left. Try again.' : 'Missed: too far right. Try again.');
    }
  }

  const target = Math.round(zone * 100);
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold uppercase tracking-widest text-mist">
        Alignment {round + 1} of {zones.length}
      </p>
      {settings.reduceMotion ? (
        <>
          <label htmlFor="align-dial" className="block font-display text-lg">
            Set the dial to <strong className="text-glow">{target}</strong> (now {dial})
          </label>
          <input id="align-dial" type="range" min={0} max={100} value={dial} onChange={(event) => setDial(Number(event.target.value))} className="h-11 w-full accent-nola" />
          <Button onClick={() => attempt(dial / 100)}>Lock in</Button>
        </>
      ) : (
        <>
          <div className="relative h-12 overflow-hidden rounded-full border-2 border-line bg-void" aria-hidden="true">
            <div className="absolute inset-y-0 border-x-4 border-go bg-go/30" style={{ left: `${(zone - halfWidth) * 100}%`, width: `${halfWidth * 200}%` }}>
              <span className="flex h-full items-center justify-center text-xs font-bold text-star">TARGET</span>
            </div>
            <div ref={marker} className="absolute inset-y-0 w-2 -translate-x-1/2 bg-nola" />
          </div>
          <Button autoFocus onClick={() => attempt(position.current)}>
            Stop!
          </Button>
        </>
      )}
      <p role="status" className="min-h-7 text-lg font-semibold">
        {message}
      </p>
    </div>
  );
}

/** Tap game: seal each leak as it appears. No time limit. */
function LeakGame({ onWin }: GameProps) {
  const spots = [5, 2, 10, 7, 0];
  const [sealed, setSealed] = useState(0);
  const leak = spots[sealed];

  function seal() {
    if (sealed + 1 >= spots.length) onWin();
    setSealed(sealed + 1);
  }

  return (
    <div className="space-y-4">
      <p className="text-lg">Find each leak on the pipe panel and press it to seal it.</p>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }, (_, cell) =>
          cell === leak ? (
            <button key={cell} type="button" onClick={seal} className="flex h-16 flex-col items-center justify-center rounded-xl border-2 border-glow bg-glow/20 text-sm font-bold text-star">
              <Droplet aria-hidden="true" size={22} className="text-glow" />
              Leak!
            </button>
          ) : (
            <div key={cell} aria-hidden="true" className="h-16 rounded-xl border-2 border-line bg-void/60" />
          ),
        )}
      </div>
      <p role="status" className="text-lg font-semibold">
        Sealed {sealed} of {spots.length}
      </p>
    </div>
  );
}

/** Follow-the-steps game: press the switches in the order shown. */
function SwitchGame({ onWin, order, task }: GameProps & { order: string[]; task: string }) {
  const [done, setDone] = useState(0);
  const [message, setMessage] = useState('');

  function press(letter: string) {
    if (letter === order[done]) {
      if (done + 1 >= order.length) onWin();
      setDone(done + 1);
      setMessage('');
    } else {
      setDone(0);
      setMessage('Wrong switch. The sequence has reset, so start again from the first one.');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-lg">
        {task} Press the switches in this order: <strong className="font-display text-xl text-glow">{order.join(' → ')}</strong>
      </p>
      <div className="grid grid-cols-4 gap-3">
        {['A', 'B', 'C', 'D'].map((letter) => {
          const pressed = order.slice(0, done).includes(letter);
          return (
            <button
              key={letter}
              type="button"
              disabled={pressed}
              onClick={() => press(letter)}
              className={`flex h-16 items-center justify-center gap-1 rounded-xl border-2 font-display text-2xl font-bold ${pressed ? 'border-go bg-go/20 text-go' : 'border-line bg-void/60 text-star hover:border-glow'}`}
            >
              {letter}
              {pressed && <Check aria-hidden="true" size={20} />}
            </button>
          );
        })}
      </div>
      <p role="status" className="min-h-7 text-lg font-semibold text-nola-soft">
        {message || `Step ${Math.min(done + 1, order.length)} of ${order.length}`}
      </p>
    </div>
  );
}

/** The repair mini-game for each kind of fault. */
export function RepairGame({ fault, onWin }: GameProps & { fault: FaultId }) {
  switch (fault) {
    case 'oxygen-generator':
      return <SwitchGame onWin={onWin} order={['C', 'A', 'D', 'B']} task="Restart the generator." />;
    case 'co2-filter':
      return <SwitchGame onWin={onWin} order={['B', 'D', 'A', 'C']} task="Release the clips and swap the filter." />;
    case 'water-leak':
      return <LeakGame onWin={onWin} />;
    case 'panel-drift':
      return <AlignGame onWin={onWin} noun="solar panels with the Sun" />;
    case 'antenna':
      return <AlignGame onWin={onWin} noun="antenna with Earth" />;
    case 'thermal-fault':
      return <AlignGame onWin={onWin} noun="thermostat sensor" />;
  }
}
