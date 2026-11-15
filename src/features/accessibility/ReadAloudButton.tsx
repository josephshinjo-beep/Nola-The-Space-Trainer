import { Square, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/audioEngine';
import { useSettings } from './SettingsContext';

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

interface ReadAloudButtonProps {
  /** The words to speak. */
  text: string;
  className?: string;
  /** 'light' for NOLA's light speech bubbles (default), 'dark' for dark panels. */
  tone?: 'light' | 'dark';
  /** Read the text by itself when the button appears (if the settings allow). Default true. */
  auto?: boolean;
}

/**
 * A "Listen" button that reads text aloud using the browser's built-in
 * voice (no internet service involved). Hidden when read-aloud is switched
 * off in the settings, or when the browser cannot speak.
 *
 * With "Read NOLA's words automatically" on (the default) it also speaks by
 * itself when it appears on screen, unless sound is muted. Browsers only
 * allow speech after the first click, tap or key press, so before that it
 * waits for one.
 */
export function ReadAloudButton({ text, className = '', tone = 'light', auto = true }: ReadAloudButtonProps) {
  const { settings } = useSettings();
  const [speaking, setSpeaking] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  function speak() {
    const current = settingsRef.current;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en';
    utterance.rate = current.speechRate === 'slow' ? 0.75 : 1;
    utterance.volume = current.voiceVolume;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  const autoOn = auto && canSpeak && settings.readAloud && settings.autoRead && !settings.muted;
  useEffect(() => {
    if (!autoOn) return;
    // Only a button that can be seen speaks (some pages keep a hidden copy for another screen size).
    const run = () => {
      const button = buttonRef.current;
      if (button && button.getClientRects().length > 0) speak();
    };
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (activation && !activation.hasBeenActive) {
      const events = ['pointerdown', 'keydown'] as const;
      const once = () => {
        events.forEach((name) => window.removeEventListener(name, once));
        window.setTimeout(run, 150);
      };
      events.forEach((name) => window.addEventListener(name, once));
      return () => events.forEach((name) => window.removeEventListener(name, once));
    }
    // A short pause lets the page settle, and lets a newer message win when several appear together.
    const timer = window.setTimeout(run, 450);
    return () => window.clearTimeout(timer);
    // speak() reads the latest settings through a ref; it should run again only for new words.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoOn]);

  // The music dips while NOLA is speaking, so her words are easy to hear.
  useEffect(() => {
    audio.duck(speaking);
    return () => audio.duck(false);
  }, [speaking]);

  // Stop talking if the button leaves the screen (for example, on page change).
  useEffect(() => {
    if (!speaking) return;
    return () => window.speechSynthesis.cancel();
  }, [speaking]);

  if (!canSpeak || !settings.readAloud) return null;

  function toggle() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    speak();
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-base font-bold transition hover:border-nola ${tone === 'dark' ? 'border-glow bg-panel text-star' : 'border-void/20 bg-void/5 text-void'} ${className}`}
    >
      {speaking ? <Square aria-hidden="true" size={16} /> : <Volume2 aria-hidden="true" size={18} />}
      {speaking ? 'Stop' : 'Listen'}
    </button>
  );
}
