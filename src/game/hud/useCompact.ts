import { useEffect, useState } from 'react';

/** Same test as the CSS "compact:" variant: narrow portrait phones and short landscape screens. */
export const COMPACT_QUERY = '(max-width: 639px), (max-height: 500px)';

export const isCompactScreen = () => typeof window !== 'undefined' && window.matchMedia(COMPACT_QUERY).matches;

/** True on phone-sized screens; follows rotation and resizing. */
export function useCompact(): boolean {
  const [compact, setCompact] = useState(isCompactScreen);
  useEffect(() => {
    const query = window.matchMedia(COMPACT_QUERY);
    const update = () => setCompact(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return compact;
}
