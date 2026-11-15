import { SkipForward } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useSettings } from '../features/accessibility/SettingsContext';
import { audio, sliderToGain } from '../features/audio/audioEngine';

/** Where the warp jump begins in the video, in seconds: used for the shorter "travel to the station" version. */
export const WARP_START = 3.8;

/**
 * A short full-screen animation: NOLA turns into a ship, jumps to warp and
 * flies into the station. After a mission challenge the whole clip plays;
 * the "Go to your station" buttons play only the warp jump (startAt).
 * It can be skipped with the button or Escape, and is not shown at all with
 * "Reduce motion" on (see wantsStillness).
 */
export function LaunchCinematic({ onDone, startAt = 0 }: { onDone: () => void; startAt?: number }) {
  const { settings } = useSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = Math.min(1, sliderToGain(settings.sfxVolume));
    video.muted = settings.muted;
    if (startAt > 0) video.currentTime = startAt;
    // Started by the button click, so sound is allowed; if the browser still says no, play it silently.
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => doneRef.current());
    });
    audio.duck(true);
    skipRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') doneRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      audio.duck(false);
    };
    // Volume is read once when the animation starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-label="Launch animation" className="launch-cinematic fixed inset-0 z-[70] flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        src="/media/unlock-launch.mp4"
        poster={startAt > 0 ? undefined : '/media/unlock-launch-poster.jpg'}
        playsInline
        preload="auto"
        disablePictureInPicture
        onEnded={() => doneRef.current()}
        onError={() => doneRef.current()}
      >
        <track kind="captions" src="/media/unlock-launch.vtt" srcLang="en" label="English" />
      </video>
      <p className="sr-only">{startAt > 0 ? 'Your ship jumps to warp speed and flies into your station.' : 'NOLA turns into a spaceship, jumps to warp speed and flies into your station.'}</p>
      <button
        ref={skipRef}
        type="button"
        onClick={() => doneRef.current()}
        className="absolute bottom-6 right-6 flex min-h-12 items-center gap-2 rounded-full border-2 border-star/40 bg-void/70 px-5 font-semibold text-star backdrop-blur transition hover:border-glow"
      >
        Skip <SkipForward aria-hidden="true" size={18} />
      </button>
    </div>
  );
}

/** True when the student or their device has asked for less motion; the animation is then skipped. */
export function wantsStillness(): boolean {
  return document.documentElement.dataset.motion === 'reduced' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
