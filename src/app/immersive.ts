import { createContext, useContext, useEffect } from 'react';

/** Lets a page ask the app frame to hide its side panel and tab bars, e.g. while the station game is running. */
export const ImmersiveContext = createContext<(on: boolean) => void>(() => {});

/** Hides the app's navigation for as long as the calling component is on screen. */
export function useImmersive() {
  const setImmersive = useContext(ImmersiveContext);
  useEffect(() => {
    setImmersive(true);
    return () => setImmersive(false);
  }, [setImmersive]);
}
