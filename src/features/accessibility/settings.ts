/**
 * Accessibility settings: what they are, their defaults, and how they are
 * applied to the page. Kept free of React so it is easy to test.
 */

export type TextSize = 'normal' | 'large' | 'xlarge';
export type SpeechRate = 'slow' | 'normal';

export interface AccessibilitySettings {
  textSize: TextSize;
  highContrast: boolean;
  dyslexiaFont: boolean;
  reduceMotion: boolean;
  /** Blue and amber instead of green and red, for colour-blind players. */
  colorSafe: boolean;
  /** Show "Listen" buttons that read NOLA's words aloud. */
  readAloud: boolean;
  speechRate: SpeechRate;
  /** Voice volume from 0 (silent) to 1 (full). */
  voiceVolume: number;
}

export const DEFAULT_SETTINGS: AccessibilitySettings = {
  textSize: 'normal',
  highContrast: false,
  dyslexiaFont: false,
  reduceMotion: false,
  colorSafe: false,
  readAloud: true,
  speechRate: 'normal',
  voiceVolume: 1,
};

const TEXT_SIZES: readonly TextSize[] = ['normal', 'large', 'xlarge'];
const SPEECH_RATES: readonly SpeechRate[] = ['slow', 'normal'];

const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);

/** Turns stored data (from the browser or database) into safe, complete settings. */
export function sanitizeSettings(raw: unknown): AccessibilitySettings {
  const data = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const volume = typeof data.voiceVolume === 'number' && Number.isFinite(data.voiceVolume) ? data.voiceVolume : d.voiceVolume;
  return {
    textSize: TEXT_SIZES.includes(data.textSize as TextSize) ? (data.textSize as TextSize) : d.textSize,
    highContrast: bool(data.highContrast, d.highContrast),
    dyslexiaFont: bool(data.dyslexiaFont, d.dyslexiaFont),
    reduceMotion: bool(data.reduceMotion, d.reduceMotion),
    colorSafe: bool(data.colorSafe, d.colorSafe),
    readAloud: bool(data.readAloud, d.readAloud),
    speechRate: SPEECH_RATES.includes(data.speechRate as SpeechRate) ? (data.speechRate as SpeechRate) : d.speechRate,
    voiceVolume: Math.min(1, Math.max(0, volume)),
  };
}

const STORAGE_KEY = 'nola.accessibility';

/** Settings remembered in this browser, so they apply even before login. */
export function loadLocalSettings(): AccessibilitySettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return sanitizeSettings(stored ? JSON.parse(stored) : null);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveLocalSettings(settings: AccessibilitySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing can block storage; the settings still work this visit.
  }
}

/** Switches the whole page over by setting attributes that index.css reacts to. */
export function applySettingsToDocument(settings: AccessibilitySettings): void {
  const root = document.documentElement;
  root.dataset.textSize = settings.textSize;
  root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
  root.dataset.font = settings.dyslexiaFont ? 'dyslexia' : 'default';
  root.dataset.motion = settings.reduceMotion ? 'reduced' : 'full';
  root.dataset.palette = settings.colorSafe ? 'safe' : 'default';
}
