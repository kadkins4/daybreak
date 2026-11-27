import { useEffect, useState } from "react";
import { Platform } from "react-native";

/**
 * Daybreak's clock. On the web it can be overridden from the address bar for
 * testing: `?at=2026-11-25T16:30` starts the clock at that local time, and
 * `?speed=600` makes it run that many times faster.
 */
function readOverride(): { start: number; speed: number } | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const at = params.get("at");
  const speed = Number(params.get("speed") ?? "1");
  if (!at && !(speed > 1)) return null;
  const start = at ? new Date(at).getTime() : Date.now();
  if (Number.isNaN(start)) return null;
  return { start, speed: speed > 0 ? speed : 1 };
}

const override = readOverride();
const bootedAt = Date.now();

export function now(): Date {
  if (!override) return new Date();
  return new Date(override.start + (Date.now() - bootedAt) * override.speed);
}

/** The current time, refreshed often enough for the dial to move smoothly. */
export function useNow(): Date {
  const [value, setValue] = useState(now);
  useEffect(() => {
    const every = override && override.speed > 1 ? 100 : 15_000;
    const timer = setInterval(() => setValue(now()), every);
    return () => clearInterval(timer);
  }, []);
  return value;
}

/**
 * The clock Journeys fly by: the real time, which is what other screens
 * and the database use. For testing on the web, `?fly=60` makes it run
 * sixty times faster on this screen, so a flight can be watched in seconds.
 */
const flySpeed =
  Platform.OS === "web" && typeof window !== "undefined"
    ? Number(new URLSearchParams(window.location.search).get("fly") ?? "1")
    : 1;

export function flightNow(): number {
  if (!(flySpeed > 1)) return Date.now();
  return bootedAt + (Date.now() - bootedAt) * flySpeed;
}
