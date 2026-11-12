import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import type { UserProfile } from '../types/user';
import { db } from './firebase';

/**
 * All reading and writing of the user profile goes through this file, so
 * pages never talk to Firestore directly. Later milestones add sibling
 * repositories for lesson progress, simulation saves and so on.
 */

/** Bumped when the stored profile shape changes, so old data can be upgraded. */
const PROFILE_SCHEMA_VERSION = 1;

const userDoc = (uid: string) => doc(db, 'users', uid);

/** Turns raw Firestore data into a typed profile, tolerating bad fields. */
function toUserProfile(data: DocumentData): UserProfile {
  return {
    displayName: typeof data.displayName === 'string' ? data.displayName : 'Cadet',
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
  };
}

interface ProfileListeners {
  onProfile: (profile: UserProfile) => void;
  /** Called when the signed-in user has no profile document yet. */
  onMissing: () => void;
  onError: (error: Error) => void;
}

/** Watches a user's profile and reports every change, live. */
export function subscribeToUserProfile(uid: string, listeners: ProfileListeners): Unsubscribe {
  return onSnapshot(
    userDoc(uid),
    (snapshot) => {
      const data = snapshot.data({ serverTimestamps: 'estimate' });
      if (data) listeners.onProfile(toUserProfile(data));
      else listeners.onMissing();
    },
    listeners.onError,
  );
}

export async function createUserProfile(uid: string, displayName: string): Promise<void> {
  await setDoc(userDoc(uid), {
    displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    schemaVersion: PROFILE_SCHEMA_VERSION,
  });
}

export async function updateDisplayName(uid: string, displayName: string): Promise<void> {
  await updateDoc(userDoc(uid), { displayName, updatedAt: serverTimestamp() });
}
