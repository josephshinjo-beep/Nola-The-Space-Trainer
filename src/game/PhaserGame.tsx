import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import type { GameBridge } from './GameBridge';
import { StationScene } from './StationScene';

/**
 * Puts the Phaser game inside a React component. The game is created when
 * this component appears and fully destroyed when it disappears, so
 * leaving the Mission page frees everything.
 */
export default function PhaserGame({ bridge }: { bridge: GameBridge }) {
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: Phaser.Game | undefined;
    // Created on the next tick: in development React mounts components twice,
    // and this way the first, immediately-cancelled mount never starts a game.
    const timer = setTimeout(() => {
      if (!holder.current) return;
      game = new Phaser.Game({
        // The plain canvas renderer is plenty for this simple scene and avoids
        // graphics-driver problems on older school computers and phones.
        type: Phaser.CANVAS,
        parent: holder.current,
        backgroundColor: '#070b1f',
        scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
        scene: new StationScene(bridge),
        audio: { noAudio: true },
        banner: false,
      });
      // Screen-reader users get the same information from the panels around the game.
      game.canvas.setAttribute('role', 'img');
      game.canvas.setAttribute('aria-label', 'Top-down view of your space station. Your location, nearby equipment and mission tasks are described in the panels around it.');
    }, 0);
    return () => {
      clearTimeout(timer);
      game?.destroy(true);
    };
  }, [bridge]);

  return <div ref={holder} className="absolute inset-0" />;
}
