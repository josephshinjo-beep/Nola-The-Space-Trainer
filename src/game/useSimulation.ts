import { useCallback, useEffect, useRef, useState } from 'react';
import type { SystemId } from '../features/unlocks/unlockManager';
import { deleteSimulation, loadSimulation, saveSimulation } from '../services/simulationRepository';
import { SIM } from '../simulation/config';
import { applyAction, createInitialState, recover, step, syncUnlocks } from '../simulation/engine';
import type { Action, ActionResult, StationState, StepInputs } from '../simulation/types';

const TICK_MS = 500;
const AUTOSAVE_MS = 20_000;

export interface Simulation {
  /** Null while the saved game is loading. */
  state: StationState | null;
  loadError: boolean;
  saveError: boolean;
  dispatch: (action: Action) => ActionResult;
  setPaused: (paused: boolean) => void;
  recoverStation: () => void;
  restart: () => Promise<void>;
  saveNow: () => void;
}

/**
 * Runs the simulation engine on a clock and keeps it saved.
 *
 * The clock only runs while the Mission page is open and not paused, so
 * nothing bad happens to a station while its student is away. The game is
 * saved every 20 seconds, after each action, when the tab is hidden and
 * when the page is left.
 */
export function useSimulation(uid: string | undefined, unlocked: readonly SystemId[], getInputs: () => StepInputs): Simulation {
  const [state, setState] = useState<StationState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const current = useRef<StationState | null>(null);
  const paused = useRef(false);
  const dirty = useRef(false);
  const inputs = useRef(getInputs);
  inputs.current = getInputs;
  const unlockedRef = useRef(unlocked);
  unlockedRef.current = unlocked;

  const commit = useCallback((next: StationState) => {
    if (next === current.current) return;
    current.current = next;
    dirty.current = true;
    setState(next);
  }, []);

  const saveNow = useCallback(() => {
    if (!uid || !dirty.current || !current.current) return;
    dirty.current = false;
    saveSimulation(uid, current.current)
      .then(() => setSaveError(false))
      .catch((error) => {
        console.error('Could not save station', error);
        dirty.current = true;
        setSaveError(true);
      });
  }, [uid]);

  // Load the saved game (or start a new one) when the student arrives.
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    loadSimulation(uid)
      .then((saved) => {
        if (cancelled) return;
        const start = saved ? syncUnlocks(saved, unlockedRef.current) : createInitialState(unlockedRef.current, Date.now() % 2_000_000_000);
        current.current = start;
        setState(start);
      })
      .catch((error) => {
        console.error('Could not load station', error);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Newly passed lessons switch their systems on, even mid-game.
  const unlockedKey = unlocked.join(',');
  useEffect(() => {
    if (current.current) commit(syncUnlocks(current.current, unlockedRef.current));
  }, [unlockedKey, commit]);

  // The game clock.
  useEffect(() => {
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      // If the browser froze the tab, do not fast-forward through the gap.
      const elapsed = Math.min(now - last, TICK_MS * 2);
      last = now;
      const before = current.current;
      if (!before || paused.current || before.status !== 'running') return;
      commit(step(before, (elapsed / 1000) * SIM.minutesPerRealSecond, inputs.current()));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [commit]);

  // Saving.
  useEffect(() => {
    const timer = setInterval(saveNow, AUTOSAVE_MS);
    const onHide = () => document.visibilityState === 'hidden' && saveNow();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
      saveNow();
    };
  }, [saveNow]);

  const dispatch = useCallback(
    (action: Action): ActionResult => {
      const before = current.current;
      if (!before) return { state: before as never, ok: false, message: 'The station is still loading.' };
      const result = applyAction(before, action);
      if (result.ok) {
        commit(result.state);
        // "visit" fires constantly while walking, so it waits for the autosave.
        if (action.type !== 'visit') setTimeout(saveNow, 800);
      }
      return result;
    },
    [commit, saveNow],
  );

  const setPaused = useCallback((value: boolean) => {
    paused.current = value;
  }, []);

  const recoverStation = useCallback(() => {
    if (current.current) {
      commit(recover(current.current));
      setTimeout(saveNow, 300);
    }
  }, [commit, saveNow]);

  const restart = useCallback(async () => {
    if (!uid) return;
    const fresh = createInitialState(unlockedRef.current, Date.now() % 2_000_000_000);
    current.current = fresh;
    dirty.current = false;
    setState(fresh);
    await deleteSimulation(uid);
  }, [uid]);

  return { state, loadError, saveError, dispatch, setPaused, recoverStation, restart, saveNow };
}
