import type { DayWeather } from "@hub/core";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import { readJson, writeJson } from "./storage";
import { supabase } from "./supabase";

interface Saved {
  /** "lat,lon" rounded, or "fallback" when location was not shared. */
  where: string;
  weather: DayWeather;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

type Position = { latitude: number; longitude: number };

/** Her current position, or null when the browser does not share it. */
async function currentPosition(): Promise<Position | null> {
  // On the web, ask the browser directly. That is what makes it show its
  // own "allow location" prompt.
  if (Platform.OS === "web") {
    if (typeof navigator === "undefined" || !navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: round2(position.coords.latitude),
            longitude: round2(position.coords.longitude),
          }),
        () => resolve(null),
        { maximumAge: 10 * 60_000, timeout: 20_000 }
      );
    });
  }
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
export function useWeather(date: string): {
  weather: DayWeather | null;
  /** True when the weather is for the fallback place, not where she is. */
  fallback: boolean;
  /** Ask for her position again, for example after a tap. */
  locate: () => void;
} {
  const [weather, setWeather] = useState<DayWeather | null>(null);
  const [fallback, setFallback] = useState(false);
  const [asked, setAsked] = useState(0);
  const locate = useCallback(() => setAsked((count) => count + 1), []);

  useEffect(() => {
    let cancelled = false;
    const key = `hub.weather.2.${date}`;

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
      setFallback(where === "fallback");
      void writeJson(key, { where, weather: data } satisfies Saved);
    };

    (async () => {
      const saved = await readJson<Saved>(key);
      if (cancelled) return;
      if (saved) {
        setWeather(saved.weather);
        setFallback(saved.where === "fallback");
      }

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
  }, [date, asked]);

  return {
    weather: weather?.date === date ? weather : null,
    fallback,
    locate,
  };
}
