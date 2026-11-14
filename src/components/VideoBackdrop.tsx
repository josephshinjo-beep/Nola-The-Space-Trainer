import { useEffect, useState } from 'react';
import { useSettings } from '../features/accessibility/SettingsContext';

const prefersStill = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The moving galaxy behind the "lobby" screens (log in, sign up and
 * Mission Control). It is decoration only: silent, looping, and dimmed so
 * text stays easy to read.
 *
 * It respects the accessibility settings: with "Reduce motion" on (in the
 * app or on the device) a still picture is shown, and in high-contrast
 * mode it is hidden so the background stays plain black.
 */
export function VideoBackdrop() {
  const { settings } = useSettings();
  const [deviceWantsStill, setDeviceWantsStill] = useState(prefersStill);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setDeviceWantsStill(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  if (settings.highContrast) return null;
  const still = settings.reduceMotion || deviceWantsStill;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-1 overflow-hidden bg-void">
      {still ? (
        <img src="/media/lobby-bg.jpg" alt="" className="h-full w-full object-cover" />
      ) : (
        <video className="h-full w-full object-cover" src="/media/lobby-bg.mp4" poster="/media/lobby-bg.jpg" autoPlay loop muted playsInline preload="auto" disablePictureInPicture />
      )}
      {/* A dark veil keeps white text readable over the bright parts of the galaxy. */}
      <div className="absolute inset-0 bg-void/55" />
    </div>
  );
}
