import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useSettings } from '../accessibility/SettingsContext';
import { audio, musicForPath } from './audioEngine';

/**
 * Picks the music for the page being shown and keeps the volumes in step
 * with the settings. Sound starts on the first click, tap or key press,
 * because browsers do not allow it before that.
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

  useEffect(() => {
    if (audio.unlocked) return;
    const unlock = () => {
      audio.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return null;
}
