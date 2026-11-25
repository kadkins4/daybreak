import { describe, expect, it } from "vitest";
import { dayFor } from "./day";
import {
  countAfterLongPress,
  countAfterTap,
  currentStreak,
  doneDaysFor,
  habitShortName,
  habitTitleAndNote,
  isDone,
  progressLabel,
} from "./habits";

const complete = { type: "complete", dailyNumber: 1 } as const;
const water = { type: "increment", dailyNumber: 4 } as const;

describe("isDone", () => {
  it("is done after one tap for a complete-type Habit", () => {
    expect(isDone(complete, 0)).toBe(false);
    expect(isDone(complete, 1)).toBe(true);
  });

  it("is done at the daily number and past it for an increment Habit", () => {
    expect(isDone(water, 3)).toBe(false);
    expect(isDone(water, 4)).toBe(true);
    expect(isDone(water, 6)).toBe(true);
  });
});

describe("taps", () => {
  it("toggles a complete-type Habit", () => {
    expect(countAfterTap(complete, 0)).toBe(1);
    expect(countAfterTap(complete, 1)).toBe(0);
  });

  it("adds one to an increment Habit, even past the daily number", () => {
    expect(countAfterTap(water, 2)).toBe(3);
    expect(countAfterTap(water, 4)).toBe(5);
  });

  it("subtracts one on long-press and stops at zero", () => {
    expect(countAfterLongPress(2)).toBe(1);
    expect(countAfterLongPress(0)).toBe(0);
  });
});

describe("progressLabel", () => {
  it("describes progress", () => {
    expect(progressLabel(water, 2)).toBe("2 of 4");
    expect(progressLabel(complete, 1)).toBe("Done");
    expect(progressLabel(complete, 0)).toBe("Not yet");
  });
});

describe("habitShortName", () => {
  it("falls back to the full name", () => {
    expect(habitShortName({ name: "Water", shortName: null })).toBe("Water");
    expect(habitShortName({ name: "Morning walk", shortName: "Walk" })).toBe(
      "Walk"
    );
  });
});

describe("currentStreak", () => {
  it("counts consecutive days ending today", () => {
    const done = ["2026-11-22", "2026-11-23", "2026-11-24"];
    expect(currentStreak(done, "2026-11-24")).toBe(3);
  });

  it("is not broken by a today that is not finished yet", () => {
    const done = ["2026-11-22", "2026-11-23"];
    expect(currentStreak(done, "2026-11-24")).toBe(2);
  });

  it("is broken by a missed day", () => {
    const done = ["2026-11-20", "2026-11-21", "2026-11-23", "2026-11-24"];
    expect(currentStreak(done, "2026-11-24")).toBe(2);
    expect(currentStreak(["2026-11-20", "2026-11-21"], "2026-11-24")).toBe(0);
  });

  it("is repaired when the missed day is filled in later", () => {
    const done = ["2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24"];
    expect(currentStreak(done, "2026-11-24")).toBe(4);
  });

  it("counts a late night toward the day it started in", () => {
    const zone = "America/Los_Angeles";
    // Done at 1:30 am on Nov 25, which still belongs to Nov 24.
    const lateNight = dayFor(new Date("2026-11-25T09:30:00Z"), zone);
    const done = ["2026-11-23", lateNight];
    // At 10:00 am on Nov 25 the streak is intact and today is still open.
    const today = dayFor(new Date("2026-11-25T18:00:00Z"), zone);
    expect(lateNight).toBe("2026-11-24");
    expect(currentStreak(done, today)).toBe(2);
  });

  it("survives a time-zone change", () => {
    // Evening in San Diego, then the next evening in Tokyo after flying.
    const inSanDiego = dayFor(
      new Date("2026-11-24T03:00:00Z"),
      "America/Los_Angeles"
    ); // Nov 23, 7 pm PST
    const landed = dayFor(new Date("2026-11-24T12:00:00Z"), "Asia/Tokyo"); // Nov 24, 9 pm JST
    const nextDay = dayFor(new Date("2026-11-25T11:00:00Z"), "Asia/Tokyo"); // Nov 25, 8 pm JST
    expect([inSanDiego, landed, nextDay]).toEqual([
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
    ]);
    expect(currentStreak([inSanDiego, landed, nextDay], nextDay)).toBe(3);
  });
});

describe("doneDaysFor", () => {
  it("keeps only the days that reached the daily number", () => {
    const done = doneDaysFor(water, [
      ["2026-11-22", 4],
      ["2026-11-23", 3],
      ["2026-11-24", 5],
    ]);
    expect([...done]).toEqual(["2026-11-22", "2026-11-24"]);
  });
});

describe("habitTitleAndNote", () => {
  it("splits a name at a comma or before a number", () => {
    expect(habitTitleAndNote("Morning walk, 5+ minutes")).toEqual({
      title: "Morning walk",
      note: "5+ minutes",
    });
    expect(habitTitleAndNote("Work out 20+ minutes")).toEqual({
      title: "Work out",
      note: "20+ minutes",
    });
  });

  it("leaves a plain name alone", () => {
    expect(habitTitleAndNote("Face and teeth")).toEqual({
      title: "Face and teeth",
      note: null,
    });
    expect(habitTitleAndNote("5 minute stretch")).toEqual({
      title: "5 minute stretch",
      note: null,
    });
  });
});
