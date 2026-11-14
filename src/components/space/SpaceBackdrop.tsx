import { useEffect, useRef } from 'react';
import { createSpaceBackground, type SpaceBackground } from './SpaceBackground';

/**
 * Puts the animated space background behind the whole app and connects it
 * to the app's accessibility settings.
 *
 * The canvas is fixed to the screen, sits behind everything and ignores
 * the mouse and touch, so it can never get in the way of the interface.
 */

let instance: SpaceBackground | null = null;
let coverCount = 0;

/**
 * Call when something opaque covers the whole screen (the lobby video,
 * the station game), so the background stops drawing frames nobody can
 * see. Returns a function that undoes it.
 */
export function pauseSpaceBackdrop(): () => void {
  coverCount += 1;
  instance?.stop();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    coverCount -= 1;
    if (coverCount === 0) instance?.start();
  };
}

/** Lets other code change the star speed, for example during a boost. */
export function setSpaceBackdropSpeed(multiplier: number): void {
  instance?.setSpeed(multiplier);
}

/** True when the student or their device has asked for less motion. */
function wantsStillness(): boolean {
  return document.documentElement.dataset.motion === 'reduced' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function SpaceBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const background = createSpaceBackground(canvasRef.current, { debug: import.meta.env.DEV });
    if (!background) return;
    instance = background;

    const applyMotion = () => background.setStatic(wantsStillness());
    applyMotion();
    if (coverCount === 0) background.start();

    // The accessibility settings write data-motion on <html>; follow changes live.
    const observer = new MutationObserver(applyMotion);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    query.addEventListener('change', applyMotion);

    return () => {
      observer.disconnect();
      query.removeEventListener('change', applyMotion);
      background.destroy();
      if (instance === background) instance = null;
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="space-backdrop" />;
}
