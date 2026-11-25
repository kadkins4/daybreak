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
