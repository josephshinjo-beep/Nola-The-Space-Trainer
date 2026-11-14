import { Award, Check, Lock, Rocket } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { StationStats } from '../../features/academy/achievements';
import { useAcademyProgress } from '../../features/academy/AcademyProgressContext';
import { loadSolMission } from '../../services/simulationRepository';
import type { SolSave } from '../sol/solFlow';
import { RANK_POINTS, RANKS } from './record';
import { useMissionRecord } from './useMissionRecord';

/**
 * Rank (Cadet to Commander) and concept badges on the profile. Each badge
 * shows its two halves, Learn and Use, with a tick or a lock, never colour alone.
 */
export function RankPanel({ uid, station }: { uid: string | undefined; station: StationStats | null }) {
  const { completedModuleIds } = useAcademyProgress();
  const [sol, setSol] = useState<SolSave | null>(null);
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    loadSolMission(uid)
      .then((saved) => !cancelled && setSol(saved))
      .catch((error) => console.error('Could not load the sol mission', error));
    return () => {
      cancelled = true;
    };
  }, [uid]);
  const { rank, badges, record, loaded } = useMissionRecord(uid, sol, station, completedModuleIds);
  const step = RANKS.findIndex((r) => r.title === rank.title);
  if (!loaded) return <p role="status" className="text-lg text-mist">Loading your rank and badges…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-nola text-void">
          <Rocket aria-hidden="true" size={32} />
        </span>
        <div>
          <p className="font-display text-2xl font-semibold">{rank.title}</p>
          <p className="text-mist">
            Rank {step + 1} of {RANKS.length} · {rank.points} rank points{record.bestScore > 0 ? ` · Best mission score ${record.bestScore}` : ''}
          </p>
          {rank.next && (
            <p className="text-base">
              Next: {rank.next.title}
              {rank.next.pointsNeeded > 0 ? `, ${rank.next.pointsNeeded} more points` : ''}. {rank.next.extra ?? ''}
            </p>
          )}
        </div>
      </div>
      <ol className="flex flex-wrap gap-2" aria-label="All ranks">
        {RANKS.map((r, index) => (
          <li key={r.title} className={`flex items-center gap-1 rounded-full border-2 px-3 py-1 text-sm font-bold ${index <= step ? 'border-nola' : 'border-line text-mist'}`}>
            {index <= step ? <Check aria-hidden="true" size={14} /> : <Lock aria-hidden="true" size={14} />} {r.title}
            <span className="sr-only">{index <= step ? '(reached)' : '(not yet)'}</span>
          </li>
        ))}
      </ol>
      <p className="text-base text-mist">
        Rank points: {RANK_POINTS.perModule} for each Academy module, {RANK_POINTS.perBadge} for each concept badge, {RANK_POINTS.missionComplete} for completing a full mission.
      </p>

      <h3 className="flex items-center gap-2 font-display text-xl font-semibold">
        <Award aria-hidden="true" size={22} /> Concept badges: {badges.filter((b) => b.earned).length} of {badges.length}
      </h3>
      <ul className="grid gap-3 sm:grid-cols-2">
        {badges.map((badge) => (
          <li key={badge.id} className={`rounded-2xl border-2 p-3 ${badge.earned ? 'border-nola bg-nola/10' : 'border-line bg-void/40'}`}>
            <p className="flex items-center gap-2 font-display text-lg font-medium">
              {badge.earned ? <Check aria-hidden="true" size={18} /> : <Lock aria-hidden="true" size={16} className="text-mist" />}
              {badge.title}
              <span className="sr-only">{badge.earned ? '(earned)' : '(not earned yet)'}</span>
            </p>
            <p className="text-mist">{badge.concept}</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li className="flex items-start gap-1">
                {badge.learned ? <Check aria-hidden="true" size={16} className="shrink-0" /> : <Lock aria-hidden="true" size={16} className="shrink-0" />}
                <span>
                  <strong>Learn:</strong> {badge.moduleId ? 'pass its Academy module' : 'no module needed'} {badge.learned ? '(done)' : ''}
                </span>
              </li>
              <li className="flex items-start gap-1">
                {badge.used ? <Check aria-hidden="true" size={16} className="shrink-0" /> : <Lock aria-hidden="true" size={16} className="shrink-0" />}
                <span>
                  <strong>Use:</strong> {badge.useIt} {badge.used ? '(done)' : ''}
                </span>
              </li>
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
