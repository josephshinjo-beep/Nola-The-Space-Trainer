/**
 * A soft coloured light that follows the mouse across the space background:
 * a wide halo that drifts behind the pointer and a smaller, brighter core
 * that keeps up with it. The colours (NOLA cyan, violet and orange) fade into
 * one another in CSS (see .cursor-glow in index.css).
 *
 * Only a mouse or pen moves it; touch screens never see it. Moving uses
 * transforms only, so the browser does not repaint the page.
 */

const HALO = 900;
const CORE = 260;

export function startCursorGlow(root: HTMLElement): () => void {
  const halo = root.querySelector<HTMLElement>('.cursor-glow__halo');
  const core = root.querySelector<HTMLElement>('.cursor-glow__core');
  if (!halo || !core) return () => {};

  const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const haloAt = { ...target };
  const coreAt = { ...target };
  let frame = 0;
  let last = 0;

  const place = () => {
    halo.style.transform = `translate3d(${haloAt.x - HALO / 2}px, ${haloAt.y - HALO / 2}px, 0)`;
    core.style.transform = `translate3d(${coreAt.x - CORE / 2}px, ${coreAt.y - CORE / 2}px, 0)`;
  };

  const step = (now: number) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    // Frame-rate independent easing: the halo trails, the core follows closely.
    const ease = (rate: number) => 1 - Math.exp(-rate * dt);
    haloAt.x += (target.x - haloAt.x) * ease(3);
    haloAt.y += (target.y - haloAt.y) * ease(3);
    coreAt.x += (target.x - coreAt.x) * ease(12);
    coreAt.y += (target.y - coreAt.y) * ease(12);
    place();
    const settled = Math.abs(target.x - haloAt.x) + Math.abs(target.y - haloAt.y) < 0.5;
    frame = settled ? 0 : requestAnimationFrame(step);
    if (settled) last = 0;
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    target.x = event.clientX;
    target.y = event.clientY;
    if (!root.dataset.on) {
      // First sighting: appear where the pointer is instead of sliding in from the middle.
      if (!root.dataset.seen) {
        Object.assign(haloAt, target);
        Object.assign(coreAt, target);
        place();
      }
      root.dataset.on = 'true';
      root.dataset.seen = 'true';
    }
    if (!frame) frame = requestAnimationFrame(step);
  };
  const onLeave = () => delete root.dataset.on;

  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('blur', onLeave);
  };
}
