import type { DayWeather } from "@hub/core";
import * as Location from "expo-location";
import { useEffect, useState } from "react";

import { readJson, writeJson } from "./storage";
import { supabase } from "./supabase";

interface Saved {
  /** "lat,lon" rounded, or "fallback" when location was not shared. */
  where: string;
  weather: DayWeather;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Her current position, or null when the browser does not share it. */
async function currentPosition(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") return null;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });
    return {
      latitude: round2(position.coords.latitude),
      longitude: round2(position.coords.longitude),
    };
  } catch {
    return null;
  }
}

/**
 * The weather for a calendar date where she is, falling back to the place in
 * Settings when location is denied. Null until it has loaded.
 */
export function useWeather(date: string): DayWeather | null {
  const [weather, setWeather] = useState<DayWeather | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = `hub.weather.${date}`;

    const load = async (
      where: string,
      position: { latitude: number; longitude: number } | null
    ) => {
      const { data, error } = await supabase.functions.invoke<DayWeather>(
        "weather",
        { body: { date, ...position } }
      );
      if (cancelled || error || !data?.hourlyTemperature) return;
      setWeather(data);
      void writeJson(key, { where, weather: data } satisfies Saved);
    };

    (async () => {
      const saved = await readJson<Saved>(key);
      if (cancelled) return;
      if (saved) setWeather(saved.weather);

      // Asking for her position can wait on a browser prompt, so show the
      // fallback place first and switch once the position arrives.
      const locating = currentPosition();
      if (!saved) await load("fallback", null);

      const position = await locating;
      if (cancelled || !position) return;
      const where = `${position.latitude},${position.longitude}`;
      if (saved?.where !== where) await load(where, position);
    })();

    return () => {
      cancelled = true;
    };
  }, [date]);

  return weather?.date === date ? weather : null;
}
