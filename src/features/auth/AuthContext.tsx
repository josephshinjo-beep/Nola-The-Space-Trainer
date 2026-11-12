import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { auth } from '../../services/firebase';
import { createUserProfile, subscribeToUserProfile } from '../../services/userRepository';
import type { UserProfile } from '../../types/user';

/**
 * AuthContext is the app's single source of truth for "who is signed in".
 *
 * Firebase remembers the session in the browser, so a returning student is
 * signed in automatically. While Firebase is checking, status is 'loading'
 * and pages wait rather than flashing the login screen.
 */

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** The Firestore profile; null until it has loaded. */
  profile: UserProfile | null;
  /** Set when the profile could not be loaded or created. */
  profileError: string | null;
  register: (displayName: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PROFILE_ERROR =
  "We couldn't load your astronaut profile. Check your connection and refresh the page.";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // The name typed on the sign-up form, held until the profile is created.
  const pendingDisplayName = useRef<string | null>(null);

  useEffect(() => {
    let stopProfileListener: (() => void) | undefined;

    const stopAuthListener = onAuthStateChanged(auth, (nextUser) => {
      stopProfileListener?.();
      stopProfileListener = undefined;
      setProfile(null);
      setProfileError(null);
      setUser(nextUser);

      if (!nextUser) {
        setStatus('signedOut');
        return;
      }
      setStatus('signedIn');

      const fail = (error: unknown) => {
        console.error('Profile error', error);
        setProfileError(PROFILE_ERROR);
      };

      stopProfileListener = subscribeToUserProfile(nextUser.uid, {
        onProfile: (loaded) => {
          setProfile(loaded);
          setProfileError(null);
        },
        // First sign-in: create the profile. The listener then fires again
        // with the new data, so there is only one code path that sets it.
        onMissing: () => {
          const name = pendingDisplayName.current ?? nextUser.displayName ?? 'Cadet';
          pendingDisplayName.current = null;
          createUserProfile(nextUser.uid, name).catch(fail);
        },
        onError: fail,
      });
    });

    return () => {
      stopProfileListener?.();
      stopAuthListener();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      profile,
      profileError,
      register: async (displayName, email, password) => {
        const name = displayName.trim();
        pendingDisplayName.current = name;
        try {
          const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          await updateProfile(credential.user, { displayName: name });
        } catch (error) {
          pendingDisplayName.current = null;
          throw error;
        }
      },
      login: async (email, password) => {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      logout: () => signOut(auth),
      sendPasswordReset: (email) => sendPasswordResetEmail(auth, email.trim()),
    }),
    [status, user, profile, profileError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
