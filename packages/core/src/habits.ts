import { addDays, type DayKey } from "./day";

export type HabitType = "complete" | "increment";

export interface Habit {
  id: string;
  name: string;
  /** Optional short name for the phone squares, e.g. "Walk". */
  shortName: string | null;
  type: HabitType;
  /** Taps needed for the day. Always 1 for complete-type Habits. */
  dailyNumber: number;
  position: number;
  archived: boolean;
}

/** The label for small spaces: the short name, or the full name without one. */
export function habitShortName(
  habit: Pick<Habit, "name" | "shortName">
): string {
  return habit.shortName?.trim() || habit.name;
}

/**
 * Splits a Habit's name into a title and a note for the wide rows:
 * "Morning walk, 5+ minutes" becomes "Morning walk" and "5+ minutes", and
 * "Work out 20+ minutes" becomes "Work out" and "20+ minutes".
 */
export function habitTitleAndNote(name: string): {
  title: string;
  note: string | null;
} {
  const match = name.match(/^(.*?)(?:,\s+|\s+(?=\d))(.+)$/);
  if (!match || !match[1].trim()) return { title: name.trim(), note: null };
  return { title: match[1].trim(), note: match[2].trim() };
}

/**
 * A Habit is done for the day when a complete-type has been tapped, or an
 * increment-type has reached its daily number. Going past the number still
 * counts as done.
 */
export function isDone(
  habit: Pick<Habit, "type" | "dailyNumber">,
  count: number
): boolean {
  const needed = habit.type === "complete" ? 1 : habit.dailyNumber;
  return count >= needed;
}

/** What one tap does to a day's count. A complete-type toggles; increment adds one. */
export function countAfterTap(
  habit: Pick<Habit, "type">,
  count: number
): number {
  if (habit.type === "complete") return count >= 1 ? 0 : 1;
  return count + 1;
}

/** What a long-press does: subtract one, never below zero. */
export function countAfterLongPress(count: number): number {
  return Math.max(0, count - 1);
}

/** The status line for a Habit: "Done", "2 of 4" or "Not yet". */
export function progressLabel(
  habit: Pick<Habit, "type" | "dailyNumber">,
  count: number
): string {
  if (habit.type === "complete") return count >= 1 ? "Done" : "Not yet";
  return `${count} of ${habit.dailyNumber}`;
}

/**
 * The count of consecutive done days, ending today or yesterday. A today that
 * is not finished yet never breaks the streak; it just isn't counted.
 */
export function currentStreak(
  doneDays: Iterable<DayKey>,
  today: DayKey
): number {
  const done = doneDays instanceof Set ? doneDays : new Set(doneDays);
  let day = done.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (done.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

/** The days on which a Habit was done, from its day-by-day counts. */
export function doneDaysFor(
  habit: Pick<Habit, "type" | "dailyNumber">,
  countsByDay: Iterable<readonly [DayKey, number]>
): Set<DayKey> {
  const done = new Set<DayKey>();
  for (const [day, count] of countsByDay) {
    if (isDone(habit, count)) done.add(day);
  }
  return done;
}

/** A count changed on this screen that the backend has not confirmed yet. */
export interface PendingCount {
  /** What the backend held when the first of these taps was made. */
  base: number;
  /** What this screen shows now. */
  count: number;
}

/**
 * What to save when pending taps finally reach the backend. The taps are
 * added on top of whatever is there now, so taps made offline on one screen
 * and taps made meanwhile on another both count. Returns null when the
 * backend already holds this screen's count and there is nothing to save.
 */
export function mergePending(
  pending: PendingCount,
  saved: number
): number | null {
  if (saved === pending.count) return null;
  return Math.max(0, saved + (pending.count - pending.base));
}
