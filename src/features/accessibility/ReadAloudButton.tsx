import { Square, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSettings } from './SettingsContext';

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

interface ReadAloudButtonProps {
  /** The words to speak. */
  text: string;
  className?: string;
  /** 'light' for NOLA's light speech bubbles (default), 'dark' for dark panels. */
  tone?: 'light' | 'dark';
}

/**
 * A "Listen" button that reads text aloud using the browser's built-in
 * voice (no internet service involved). Hidden when read-aloud is switched
 * off in the settings, or when the browser cannot speak.
 */
export function ReadAloudButton({ text, className = '', tone = 'light' }: ReadAloudButtonProps) {
  const { settings } = useSettings();
  const [speaking, setSpeaking] = useState(false);

  // Stop talking if the button leaves the screen (for example, on page change).
  useEffect(() => {
    if (!speaking) return;
    return () => window.speechSynthesis.cancel();
  }, [speaking]);

  if (!canSpeak || !settings.readAloud) return null;

  function toggle() {
    window.speechSynthesis.cancel();
    if (speaking) {
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en';
    utterance.rate = settings.speechRate === 'slow' ? 0.75 : 1;
    utterance.volume = settings.voiceVolume;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <button
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
