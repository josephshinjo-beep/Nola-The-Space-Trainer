import { useEffect, useMemo, useRef, useState } from 'react';
import type { StationStats } from '../../features/academy/achievements';
import { loadMissionRecord, saveMissionRecord } from '../../services/simulationRepository';
import type { SolSave } from '../sol/solFlow';
import { badgeStatus, badgesUsed, EMPTY_RECORD, mergeRecord, rankFor, scoreMission, type BadgeStatus, type Rank, type SavedRecord } from './record';

export interface MissionRecord {
  record: SavedRecord;
  badges: BadgeStatus[];
  rank: Rank;
  /** False until the saved record has loaded. */
  loaded: boolean;
}

/**
 * Badges and rank for the signed-in player. Loads the saved record, works
 * out what is earned now, and saves anything new (a badge, or a finished
 * mission), so restarting the station never takes it away.
 */
export function useMissionRecord(uid: string | undefined, sol: SolSave | null, station: StationStats | null, completedModules: readonly string[]): MissionRecord {
  const [record, setRecord] = useState<SavedRecord>(EMPTY_RECORD);
  const loaded = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    loadMissionRecord(uid)
      .then((saved) => {
        if (cancelled) return;
        loaded.current = true;
        setRecord(saved);
        setIsLoaded(true);
      })
      .catch((error) => console.error('Could not load the mission record', error));
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const badges = useMemo(() => badgeStatus(completedModules, badgesUsed(sol?.state ?? null, station), record.badges), [completedModules, sol, station, record.badges]);

  // Save new badges and a finished mission.
  const finishedKey = sol && sol.state.status !== 'active' ? sol.missionId : null;
  const earnedKey = badges.filter((badge) => badge.earned).map((badge) => badge.id).join(',');
  useEffect(() => {
    if (!uid || !loaded.current) return;
    const finished = sol && finishedKey ? { missionId: finishedKey, score: scoreMission(sol.state).total, complete: sol.state.status === 'complete' } : null;
    const next = mergeRecord(record, earnedKey ? earnedKey.split(',') : [], finished);
    if (!next) return;
    setRecord(next);
    saveMissionRecord(uid, next).catch((error) => console.error('Could not save the mission record', error));
    // `sol` is read only when the finished mission changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, earnedKey, finishedKey, record]);

  const rank = rankFor(completedModules.length, badges.filter((badge) => badge.earned).length, record.missionsCompleted, record.bestScore);
  return { record, badges, rank, loaded: isLoaded };
}
