/**
 * A short word for the sky from a WMO weather code, as Open-Meteo reports it.
 * Clear skies read as "Sunny" by day and "Clear" at night.
 */
export function conditionLabel(code: number, night: boolean): string {
  if (code === 0) return night ? "Clear" : "Sunny";
  if (code === 1) return night ? "Mostly clear" : "Mostly sunny";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code >= 95) return "Thunderstorms";
  return "Cloudy";
}

/** Minutes since midnight from a local timestamp like "2026-11-25T06:24". */
export function clockMinutes(localTimestamp: string): number {
  const [hours, minutes] = localTimestamp.slice(11, 16).split(":").map(Number);
  return hours * 60 + minutes;
}

/** Minutes since midnight as "6:24", or "6:24 AM" with the period. */
export function formatClock(minutes: number, withPeriod = false): string {
  const whole = Math.floor(((minutes % 1440) + 1440) % 1440);
  const hours24 = Math.floor(whole / 60);
  const hours = hours24 % 12 || 12;
  const text = `${hours}:${String(whole % 60).padStart(2, "0")}`;
  return withPeriod ? `${text} ${hours24 < 12 ? "AM" : "PM"}` : text;
}

/** One day of weather for one place, as the backend returns it. */
export interface DayWeather {
  /** The calendar date, "YYYY-MM-DD", in the place's own time zone. */
  date: string;
  place: string;
  /** Minutes since local midnight. */
  sunrise: number;
  sunset: number;
  high: number;
  low: number;
  /** 24 values, one per local hour, in degrees Fahrenheit. */
  hourlyTemperature: number[];
  /** 24 WMO weather codes, one per local hour. */
  hourlyCode: number[];
  /** How far the place's clock is ahead of UTC, in seconds. */
  utcOffsetSeconds?: number;
}

/**
 * Re-times a day of weather from the place's clock to the clock of the
 * screen being used. They differ when the weather falls back to a place in
 * another time zone: San Diego's 4:43 pm sunset is 7:43 pm on a screen in
 * New York.
 */
export function onDeviceClock(
  weather: DayWeather,
  deviceOffsetSeconds: number
): DayWeather {
  if (weather.utcOffsetSeconds === undefined) return weather;
  const shift = (deviceOffsetSeconds - weather.utcOffsetSeconds) / 60;
  if (shift === 0) return weather;
  const wrap = (minutes: number) => (((minutes + shift) % 1440) + 1440) % 1440;
  const hours = Math.round(shift / 60);
  const turn = <T>(values: T[]) =>
    values.map((_, hour) => values[(((hour - hours) % 24) + 24) % 24]);
  return {
    ...weather,
    sunrise: wrap(weather.sunrise),
    sunset: wrap(weather.sunset),
    hourlyTemperature: turn(weather.hourlyTemperature),
    hourlyCode: turn(weather.hourlyCode),
    utcOffsetSeconds: deviceOffsetSeconds,
  };
}

/** The temperature and sky for a time of day, read from the day's hours. */
export function weatherAt(
  weather: Pick<DayWeather, "hourlyTemperature" | "hourlyCode">,
  minutes: number
): { temperature: number; code: number } {
  const hour = Math.min(23, Math.max(0, Math.floor(minutes / 60)));
  return {
    temperature: Math.round(weather.hourlyTemperature[hour]),
    code: weather.hourlyCode[hour],
  };
}
