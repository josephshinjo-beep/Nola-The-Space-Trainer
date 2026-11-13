import { useEffect, useState } from 'react';
import { createSpaceDataProvider } from './providers';
import { summarizeSpaceWeather, type SpaceWeatherSummary } from './spaceWeatherModel';
import type { EnvironmentalData } from './types';

const REFRESH_MS = 30 * 60 * 1000;

export interface SpaceWeather {
  data: EnvironmentalData | null;
  summary: SpaceWeatherSummary | null;
}

/** Loads space-weather data when the game opens and refreshes it every half hour. */
export function useSpaceWeather(): SpaceWeather {
  const [weather, setWeather] = useState<SpaceWeather>({ data: null, summary: null });

  useEffect(() => {
    const provider = createSpaceDataProvider();
    let cancelled = false;
    const load = () =>
      provider
        .getEnvironmentalData()
        .then((data) => !cancelled && setWeather({ data, summary: summarizeSpaceWeather(data) }))
        .catch((error) => console.error('No space weather data available', error));
    void load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return weather;
}
