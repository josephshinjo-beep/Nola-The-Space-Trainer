import { ArrowLeft, Gauge } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useAcademyProgress } from '../features/academy/AcademyProgressContext';
import { ROOMS } from '../game/stationMap';
import type { Quality, Station3D } from '../game3d/Station3D';
import type { RoomId } from '../simulation/types';

const QUALITY_KEY = 'nola.mission3d.quality';

function savedQuality(): Quality {
  try {
    return localStorage.getItem(QUALITY_KEY) === 'low' ? 'low' : 'high';
  } catch {
    return 'high';
  }
}

/**
 * /mission3d: a preview of the station in 3D, from a fixed high-angle
 * diagonal camera. It uses the same layout and locked doors as the 2D game.
 */
export default function Mission3DPage() {
  const { unlockedSystems, loaded } = useAcademyProgress();
  const holder = useRef<HTMLDivElement>(null);
  const station = useRef<Station3D | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [quality, setQuality] = useState<Quality>(savedQuality);
  const lockedKey = ROOMS.filter((room) => !unlockedSystems.includes(room.system))
    .map((room) => room.id)
    .join(',');

  // Create the scene once the lesson progress is known; rebuild only if locked rooms change.
  useEffect(() => {
    if (!loaded || !holder.current) return;
    let cancelled = false;
    let created: Station3D | null = null;
    // three.js is large, so it is downloaded only when this page opens.
    void import('../game3d/Station3D').then(({ Station3D: Scene }) => {
      if (cancelled || !holder.current) return;
      created = new Scene(holder.current, { lockedRooms: lockedKey ? (lockedKey.split(',') as RoomId[]) : [], quality: savedQuality(), onFps: setFps });
      station.current = created;
    });
    return () => {
      cancelled = true;
      created?.dispose();
      station.current = null;
    };
  }, [loaded, lockedKey]);

  function changeQuality(next: Quality) {
    setQuality(next);
    station.current?.setQuality(next);
    try {
      localStorage.setItem(QUALITY_KEY, next);
    } catch {
      // Private browsing can block storage; the choice still applies now.
    }
  }

  if (loaded && !unlockedSystems.includes('station-access')) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-3xl font-semibold">NOLA Mission in 3D</h1>
        <p className="text-lg">The station airlock is still sealed. Pass Module 1 in the Academy to open it.</p>
        <Link to="/academy" className="font-bold text-glow underline">
          Go to the Academy
        </Link>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden bg-void">
      <div ref={holder} className="absolute inset-0" />
      <h1 className="sr-only">NOLA Mission in 3D (preview)</h1>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
        <div className="flex items-start justify-between gap-2">
          <Link to="/mission" className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-line bg-hull/90 px-4 font-bold">
            <ArrowLeft aria-hidden="true" size={18} /> 2D station
          </Link>
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border-2 border-line bg-hull/90 p-1">
            <Gauge aria-hidden="true" size={18} className="ml-2 text-mist" />
            <span className="sr-only">Graphics quality</span>
            {(['low', 'high'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={quality === option}
                onClick={() => changeQuality(option)}
                className={`min-h-9 rounded-full px-3 text-sm font-bold ${quality === option ? 'bg-glow text-void' : 'text-mist'}`}
              >
                {option === 'low' ? 'Low' : 'High'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end justify-between gap-2 text-sm font-bold">
          <p className="rounded-xl bg-hull/90 px-3 py-2">Move: W A S D or arrows · Turn camera: Q / E</p>
          <p className="rounded-xl bg-hull/90 px-3 py-2 text-mist" aria-live="off">
            {fps === null ? 'Starting…' : `${fps} FPS`}
          </p>
        </div>
      </div>
    </div>
  );
}
