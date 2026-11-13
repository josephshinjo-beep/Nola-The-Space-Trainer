import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { reviveState } from '../simulation/engine';
import type { StationState } from '../simulation/types';
import { db } from './firebase';

/** Saves and loads the station game at users/{uid}/simulation/current. */

const saveDoc = (uid: string) => doc(db, 'users', uid, 'simulation', 'current');

/** Returns the saved game, or null if there is none (or it cannot be used). */
export async function loadSimulation(uid: string): Promise<StationState | null> {
  const snapshot = await getDoc(saveDoc(uid));
  return snapshot.exists() ? reviveState(snapshot.data().state) : null;
}

export async function saveSimulation(uid: string, state: StationState): Promise<void> {
  await setDoc(saveDoc(uid), { state, savedAt: serverTimestamp() });
}

export async function deleteSimulation(uid: string): Promise<void> {
  await deleteDoc(saveDoc(uid));
}
