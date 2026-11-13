import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { EMPTY_PROGRESS, type ModuleProgress, type ProgressMap } from '../features/academy/progress';
import { db } from './firebase';

/** Reads and writes Academy progress at users/{uid}/academy/{moduleId}. */

const academyCollection = (uid: string) => collection(db, 'users', uid, 'academy');
const moduleDoc = (uid: string, moduleId: string) => doc(db, 'users', uid, 'academy', moduleId);

const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

function toModuleProgress(data: DocumentData): ModuleProgress {
  return {
    stage: num(data.stage) ?? 0,
    quizPassed: data.quizPassed === true,
    challengeDone: data.challengeDone === true,
    completed: data.completed === true,
    bestScore: num(data.bestScore),
    lastScore: num(data.lastScore),
    quizTotal: num(data.quizTotal),
    attempts: num(data.attempts) ?? 0,
    completedAt: data.completedAt instanceof Timestamp ? data.completedAt.toDate() : null,
  };
}

export function subscribeToAcademyProgress(
  uid: string,
  onProgress: (progress: ProgressMap) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    academyCollection(uid),
    (snapshot) => {
      const progress: ProgressMap = {};
      snapshot.forEach((document) => {
        progress[document.id] = toModuleProgress(document.data({ serverTimestamps: 'estimate' }));
      });
      onProgress(progress);
    },
    onError,
  );
}

/** Saves changes to one module, keeping fields that are not mentioned. */
export async function saveModuleProgress(uid: string, moduleId: string, changes: Partial<ModuleProgress>): Promise<void> {
  const { completedAt: _ignored, ...plain } = changes;
  await setDoc(
    moduleDoc(uid, moduleId),
    {
      ...plain,
      ...(changes.completed ? { completedAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** Starts one module again from the beginning. */
export async function resetModuleProgress(uid: string, moduleId: string): Promise<void> {
  await deleteDoc(moduleDoc(uid, moduleId));
}

/** Starts the whole course again. */
export async function resetAllProgress(uid: string, moduleIds: readonly string[]): Promise<void> {
  const batch = writeBatch(db);
  for (const moduleId of moduleIds) batch.delete(moduleDoc(uid, moduleId));
  await batch.commit();
}

export { EMPTY_PROGRESS };
