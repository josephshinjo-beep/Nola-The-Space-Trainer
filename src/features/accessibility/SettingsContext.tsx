import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { updateSettings } from '../../services/userRepository';
import { useAuth } from '../auth/AuthContext';
import {
  applySettingsToDocument,
  loadLocalSettings,
  saveLocalSettings,
  type AccessibilitySettings,
} from './settings';

/**
 * Holds the accessibility settings for the whole app.
 *
 * They are kept in two places: this browser (so they work on the login
 * page too) and, once signed in, the student's own profile (so they
 * follow the student to any device). The account copy wins when both exist.
 */

interface SettingsContextValue {
  settings: AccessibilitySettings;
  update: (changes: Partial<AccessibilitySettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState<AccessibilitySettings>(loadLocalSettings);

  // Adopt the settings saved on the account whenever they arrive or change.
  const accountSettings = profile?.settings ? JSON.stringify(profile.settings) : null;
  useEffect(() => {
    if (!accountSettings) return;
    setSettings((current) =>
      JSON.stringify(current) === accountSettings ? current : (JSON.parse(accountSettings) as AccessibilitySettings),
    );
  }, [accountSettings]);

  useEffect(() => {
    applySettingsToDocument(settings);
    saveLocalSettings(settings);
  }, [settings]);

  const uid = user?.uid;
  const update = useCallback(
    (changes: Partial<AccessibilitySettings>) => {
      const next = { ...settings, ...changes };
      setSettings(next);
      if (uid) {
        updateSettings(uid, next).catch((error) => console.error('Could not save settings', error));
      }
    },
    [settings, uid],
  );

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside <SettingsProvider>.');
  return value;
}
