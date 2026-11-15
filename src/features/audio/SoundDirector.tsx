import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useSettings } from '../accessibility/SettingsContext';
import { audio, musicForPath } from './audioEngine';

/**
 * Picks the music for the page being shown and keeps the volumes in step
 * with the settings. Music is on by default and tries to start straight
 * away; if the browser blocks autoplay, it starts on the first click, tap or
 * key press instead.
 */
export function SoundDirector() {
  const { pathname } = useLocation();
  const { settings } = useSettings();

  useEffect(() => {
    audio.playMusic(musicForPath(pathname));
  }, [pathname]);

  useEffect(() => {
    audio.setVolumes(settings.musicVolume, settings.sfxVolume, settings.muted);
  }, [settings.musicVolume, settings.sfxVolume, settings.muted]);

  // Muting also stops NOLA mid-sentence.
  useEffect(() => {
    if (settings.muted && typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, [settings.muted]);

  useEffect(() => {
    // Autoplay attempt as soon as the app opens.
    audio.unlock();
    const events = ['pointerdown', 'keydown', 'touchend'] as const;
    let timer = 0;
    const remove = () => events.forEach((name) => window.removeEventListener(name, unlock));
    function unlock() {
      audio.unlock();
      // Starting is asynchronous; stop listening only once sound is really playing.
      window.clearTimeout(timer);
      timer = window.setTimeout(() => audio.unlocked && remove(), 300);
    }
    events.forEach((name) => window.addEventListener(name, unlock));
    return () => {
      window.clearTimeout(timer);
      remove();
    };
  }, []);

  return null;
}
