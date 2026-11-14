import { useEffect, useRef } from 'react';
import type { GameBridge } from '../game/GameBridge';
import type { Quality, Station3D } from './Station3D';

interface Props {
  bridge: GameBridge;
  quality: Quality;
  name?: string;
  onFps?: (fps: number) => void;
}

/**
 * Puts the 3D station inside a React component, like PhaserGame does for
 * the 2D game. three.js is downloaded only when this first appears, and
 * everything is freed when it disappears.
 */
export default function Station3DView({ bridge, quality, name, onFps }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const scene = useRef<Station3D | null>(null);
  const settings = useRef({ quality, name, onFps });

  useEffect(() => {
    settings.current = { quality, name, onFps };
  });

  useEffect(() => {
    let cancelled = false;
    let created: Station3D | null = null;
    void import('./Station3D').then(({ Station3D: Scene }) => {
      if (cancelled || !holder.current) return;
      const { quality: q, name: n } = settings.current;
      created = new Scene(holder.current, { bridge, quality: q, name: n, onFps: (value) => settings.current.onFps?.(value) });
      scene.current = created;
    });
    return () => {
      cancelled = true;
      created?.dispose();
      scene.current = null;
    };
  }, [bridge]);

  useEffect(() => {
    scene.current?.setQuality(quality);
  }, [quality]);

  return <div ref={holder} className="absolute inset-0 overflow-hidden" />;
}
