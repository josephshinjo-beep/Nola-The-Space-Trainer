import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteSolMission, loadSolMission, saveSolMission } from '../../services/simulationRepository';
import type { StormStart } from '../../sol/engine';
import type { RadiationStorm, Result, StormChoice } from '../../sol/types';
import { announceStorm, answerStorm, completeJob, finishSol, newSolSave, planSol, skipPlanning, stormHits, type SolSave, type SolSummary } from './solFlow';

export interface SolMission {
  /** Null while loading. */
  save: SolSave | null;
  loadError: boolean;
  plan: (decisionId: string) => Result<SolSave>;
  skip: () => void;
  completeJob: (taskId: string) => void;
  finish: () => SolSummary | null;
  restart: () => Promise<void>;
  announceStorm: (start: StormStart) => void;
  answerStorm: (choice: StormChoice) => Result<SolSave>;
  /** The storm arrives now. Returns the storm that hit, or null. */
  stormHits: () => RadiationStorm | null;
}

/**
 * Loads the student's sol mission (or starts a new one) and saves every
 * change straight away. Changes happen only on deliberate actions, such as
 * choosing a card, so saving each one is cheap.
 */
export function useSolMission(uid: string | undefined): SolMission {
  const [save, setSave] = useState<SolSave | null>(null);
  const [loadError, setLoadError] = useState(false);
  const current = useRef<SolSave | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    loadSolMission(uid)
      .then((saved) => {
        if (cancelled) return;
        const start = saved ?? newSolSave();
        current.current = start;
        setSave(start);
      })
      .catch((error) => {
        console.error('Could not load the sol mission', error);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const commit = useCallback(
    (next: SolSave) => {
      current.current = next;
      setSave(next);
      if (uid) saveSolMission(uid, next).catch((error) => console.error('Could not save the sol mission', error));
    },
    [uid],
  );

  const plan = useCallback(
    (decisionId: string): Result<SolSave> => {
      if (!current.current) return { ok: false, reason: 'Still loading.' };
      const result = planSol(current.current, decisionId);
      if (result.ok) commit(result.state);
      return result;
    },
    [commit],
  );

  const skip = useCallback(() => {
    if (!current.current) return;
    const result = skipPlanning(current.current);
    if (result.ok) commit(result.state);
  }, [commit]);

  const complete = useCallback(
    (taskId: string) => {
      if (current.current) commit(completeJob(current.current, taskId));
    },
    [commit],
  );

  const finish = useCallback((): SolSummary | null => {
    if (!current.current) return null;
    const result = finishSol(current.current);
    if (!result.ok) return null;
    commit(result.state);
    return result.summary ?? null;
  }, [commit]);

  const restart = useCallback(async () => {
    const fresh = newSolSave();
    current.current = fresh;
    setSave(fresh);
    if (uid) await deleteSolMission(uid);
  }, [uid]);

  const announce = useCallback(
    (start: StormStart) => {
      if (!current.current) return;
      const result = announceStorm(current.current, start);
      if (result.ok) commit(result.state);
    },
    [commit],
  );

  const answer = useCallback(
    (choice: StormChoice): Result<SolSave> => {
      if (!current.current) return { ok: false, reason: 'Still loading.' };
      const result = answerStorm(current.current, choice);
      if (result.ok) commit(result.state);
      return result;
    },
    [commit],
  );

  const hits = useCallback((): RadiationStorm | null => {
    if (!current.current) return null;
    const result = stormHits(current.current);
    if (!result.ok) return null;
    commit(result.state);
    return result.storm ?? null;
  }, [commit]);

  return { save, loadError, plan, skip, completeJob: complete, finish, restart, announceStorm: announce, answerStorm: answer, stormHits: hits };
}
