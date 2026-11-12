import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

/**
 * The single place where Firebase is started. The rest of the app imports
 * `auth` and `db` from here rather than creating its own connections.
 */
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

/**
 * Firestore keeps a copy of the student's data on the device. Saves made
 * on a slow or dropped connection are queued and sent later, and pages
 * load instantly on the next visit. Falls back to memory-only where the
 * browser blocks storage (for example, some private windows).
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
