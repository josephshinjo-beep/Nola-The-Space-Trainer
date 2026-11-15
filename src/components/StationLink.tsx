import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { LaunchCinematic, WARP_START, wantsStillness } from './LaunchCinematic';

/**
 * A "Go to your station" link that flies there: a short warp-jump animation
 * plays first, then the game opens. It is still a real link, so opening it in
 * a new tab or with "Reduce motion" on goes straight to the game.
 */
export function StationLink({ className, children }: { className?: string; children: ReactNode }) {
  const [flying, setFlying] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <Link
        to="/mission"
        className={className}
        onClick={(event) => {
          // Let ctrl/cmd-click and middle-click open a new tab as usual.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0 || wantsStillness()) return;
          event.preventDefault();
          setFlying(true);
        }}
      >
        {children}
      </Link>
      {flying && <LaunchCinematic startAt={WARP_START} onDone={() => void navigate('/mission')} />}
    </>
  );
}
