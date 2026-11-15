import { SkipForward } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useSettings } from '../../accessibility/SettingsContext';
import { audio, sliderToGain } from '../../audio/audioEngine';

/**
 * A short full-screen animation after a mission challenge: NOLA turns into a
 * ship, jumps to warp and flies into the station. The lesson then opens the
 * station game. It can be skipped with the button or Escape, and is not
 * shown at all with "Reduce motion" on (the caller checks that).
 */
export function LaunchCinematic({ onDone }: { onDone: () => void }) {
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
        poster="/media/unlock-launch-poster.jpg"
        playsInline
        preload="auto"
        disablePictureInPicture
        onEnded={() => doneRef.current()}
        onError={() => doneRef.current()}
      >
        <track kind="captions" src="/media/unlock-launch.vtt" srcLang="en" label="English" />
      </video>
      <p className="sr-only">NOLA turns into a spaceship, jumps to warp speed and flies into your station.</p>
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
