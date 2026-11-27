import {
  FALLBACK_SUN_TIMES,
  css,
  dayFor,
  deviceTimeZone,
  isNight,
  minutesIntoDay,
  onDeviceClock,
  paletteAt,
  type DayKey,
  type DayWeather,
  type Palette,
  type SunTimes,
} from "@daybreak/core";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useNow } from "./clock";
import { useWeather } from "./weather";

interface Sky {
  now: Date;
  /** Minutes since local midnight. */
  minutes: number;
  /** Daybreak's day, which changes at 4:00 am. */
  today: DayKey;
  weather: DayWeather | null;
  /** True when the weather is for the fallback place, not where he is. */
  weatherIsFallback: boolean;
  /** Ask the browser for his position again. */
  locate: () => void;
  sun: SunTimes;
  night: boolean;
  palette: Palette;
  /** The accent color as CSS, with an optional opacity. */
  accent: (opacity?: number) => string;
  glow: (opacity?: number) => string;
  base: string;
}

const SkyContext = createContext<Sky | null>(null);

/** Works out the time, the weather and the colors that follow the sun. */
export function SkyProvider({ children }: { children: ReactNode }) {
  const now = useNow();
  const timeZone = deviceTimeZone();
  const calendarDate = dayFor(now, timeZone, 0);
  const { weather: fetched, fallback, locate } = useWeather(calendarDate);
  // The weather comes on its own place's clock. Put it on this screen's.
  const deviceOffset = -now.getTimezoneOffset() * 60;
  const weather = useMemo(
    () => (fetched ? onDeviceClock(fetched, deviceOffset) : null),
    [fetched, deviceOffset]
  );

  const value = useMemo<Sky>(() => {
    const minutes = minutesIntoDay(now, timeZone);
    const sun: SunTimes = weather
      ? { sunrise: weather.sunrise, sunset: weather.sunset }
      : FALLBACK_SUN_TIMES;
    const palette = paletteAt(minutes, sun);
    return {
      now,
      minutes,
      today: dayFor(now, timeZone),
      weather,
      weatherIsFallback: fallback,
      locate,
      sun,
      night: isNight(minutes, sun),
      palette,
      accent: (opacity) => css(palette.accent, opacity),
      glow: (opacity) => css(palette.glow, opacity),
      base: css(palette.base),
    };
  }, [now, timeZone, weather, fallback, locate]);

  return <SkyContext.Provider value={value}>{children}</SkyContext.Provider>;
}

export function useSky(): Sky {
  const value = useContext(SkyContext);
  if (!value) throw new Error("useSky must be used inside SkyProvider");
  return value;
}
