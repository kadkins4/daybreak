import {
  FALLBACK_SUN_TIMES,
  css,
  dayFor,
  deviceTimeZone,
  isNight,
  minutesIntoDay,
  paletteAt,
  type DayKey,
  type DayWeather,
  type Palette,
  type SunTimes,
} from "@hub/core";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useNow } from "./clock";
import { useWeather } from "./weather";

interface Sky {
  now: Date;
  /** Minutes since local midnight. */
  minutes: number;
  /** The Hub's day, which changes at 4:00 am. */
  today: DayKey;
  weather: DayWeather | null;
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
  const weather = useWeather(calendarDate);

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
      sun,
      night: isNight(minutes, sun),
      palette,
      accent: (opacity) => css(palette.accent, opacity),
      glow: (opacity) => css(palette.glow, opacity),
      base: css(palette.base),
    };
  }, [now, timeZone, weather]);

  return <SkyContext.Provider value={value}>{children}</SkyContext.Provider>;
}

export function useSky(): Sky {
  const value = useContext(SkyContext);
  if (!value) throw new Error("useSky must be used inside SkyProvider");
  return value;
}
