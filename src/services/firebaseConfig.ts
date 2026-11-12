import type { FirebaseOptions } from 'firebase/app';

/**
 * Reads the Firebase web configuration from environment variables.
 *
 * These values identify the Firebase project; they are not passwords.
 * What actually protects student data is Firebase Authentication plus the
 * Firestore security rules in /firestore.rules.
 */
const env = import.meta.env;

const entries = {
  VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID,
} satisfies Record<string, string | undefined>;

/** Names of any configuration values that are missing or empty. */
export const missingFirebaseKeys: string[] = Object.entries(entries)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const firebaseConfig: FirebaseOptions = {
  apiKey: entries.VITE_FIREBASE_API_KEY,
  authDomain: entries.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: entries.VITE_FIREBASE_PROJECT_ID,
  storageBucket: entries.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: entries.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: entries.VITE_FIREBASE_APP_ID,
};
