/** A calendar day as "YYYY-MM-DD". Sorts correctly as a plain string. */
export type DayKey = string;

/** Day rollover: the Hub's day changes at 4:00 am local time, not midnight. */
export const DEFAULT_ROLLOVER_MINUTES = 4 * 60;

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function localParts(moment: Date, timeZone: string) {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatters.set(timeZone, formatter);
  }
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(moment)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return parts as {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
}

function toDayKey(utcMidnight: Date): DayKey {
  return utcMidnight.toISOString().slice(0, 10);
}

/**
 * Which day a moment belongs to in a time zone. Before the rollover time the
 * moment still counts toward the previous calendar day, so a late night
 * finishes the day it started in.
 */
export function dayFor(
  moment: Date,
  timeZone: string,
  rolloverMinutes = DEFAULT_ROLLOVER_MINUTES
): DayKey {
  const { year, month, day, hour, minute } = localParts(moment, timeZone);
  const beforeRollover = hour * 60 + minute < rolloverMinutes;
  // Calendar maths on a UTC date, so daylight saving never shifts the answer.
  return toDayKey(
    new Date(Date.UTC(year, month - 1, day - (beforeRollover ? 1 : 0)))
  );
}

/** Minutes since local midnight, with seconds as a fraction. */
export function minutesIntoDay(moment: Date, timeZone: string): number {
  const { hour, minute, second } = localParts(moment, timeZone);
  return hour * 60 + minute + second / 60;
}

/** The day a number of days after (or, when negative, before) another. */
export function addDays(day: DayKey, amount: number): DayKey {
  const [year, month, date] = day.split("-").map(Number);
  return toDayKey(new Date(Date.UTC(year, month - 1, date + amount)));
}

/** The time zone of the screen being used. */
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** A day as a heading, e.g. "Tuesday, November 24". */
export function formatDayHeading(day: DayKey, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${day}T12:00:00Z`));
}
