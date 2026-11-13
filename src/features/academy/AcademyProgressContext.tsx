import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  resetAllProgress,
  resetModuleProgress,
  saveModuleProgress,
  subscribeToAcademyProgress,
} from '../../services/academyRepository';
import { useAuth } from '../auth/AuthContext';
import { getUnlockedSystems, type SystemId } from '../unlocks/unlockManager';
import { CURRICULUM } from './curriculum';
import { completedModuleIds as listCompleted, type ModuleProgress, type ProgressMap } from './progress';

/**
 * Live Academy progress for the signed-in student, shared by every page.
 * One subscription feeds Mission Control, the Academy, the profile and
 * the game, so they can never disagree about what has been unlocked.
 */

interface AcademyProgressValue {
  progress: ProgressMap;
  /** False until the first load from the database finishes. */
  loaded: boolean;
  error: string | null;
  completedModuleIds: string[];
  unlockedSystems: SystemId[];
  save: (moduleId: string, changes: Partial<ModuleProgress>) => Promise<void>;
  resetModule: (moduleId: string) => Promise<void>;
  resetCourse: () => Promise<void>;
}

const AcademyProgressContext = createContext<AcademyProgressValue | null>(null);

export function AcademyProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProgress({});
    setLoaded(false);
    setError(null);
    if (!uid) return;
    return subscribeToAcademyProgress(
      uid,
      (next) => {
        setProgress(next);
        setLoaded(true);
      },
      (problem) => {
        console.error('Academy progress error', problem);
        setError("We couldn't load your training progress. Check your connection and refresh.");
        setLoaded(true);
      },
    );
  }, [uid]);

  const save = useCallback(
    async (moduleId: string, changes: Partial<ModuleProgress>) => {
      if (uid) await saveModuleProgress(uid, moduleId, changes);
    },
    [uid],
  );
  const resetModule = useCallback(
    async (moduleId: string) => {
      if (uid) await resetModuleProgress(uid, moduleId);
    },
    [uid],
  );
  const resetCourse = useCallback(async () => {
    if (uid) await resetAllProgress(uid, CURRICULUM.map((module) => module.id));
  }, [uid]);

  const value = useMemo<AcademyProgressValue>(() => {
    const completed = listCompleted(progress);
    return {
      progress,
      loaded,
      error,
      completedModuleIds: completed,
      unlockedSystems: getUnlockedSystems(completed),
      save,
      resetModule,
      resetCourse,
    };
  }, [progress, loaded, error, save, resetModule, resetCourse]);

  return <AcademyProgressContext.Provider value={value}>{children}</AcademyProgressContext.Provider>;
}

export function useAcademyProgress(): AcademyProgressValue {
  const value = useContext(AcademyProgressContext);
  if (!value) throw new Error('useAcademyProgress must be used inside <AcademyProgressProvider>.');
  return value;
}
