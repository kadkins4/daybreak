import { describe, expect, it } from "vitest";
import { formatTodayHeading } from "./today";

describe("formatTodayHeading", () => {
  it("formats a date as weekday, month and day", () => {
    const date = new Date(2026, 10, 24, 12);
    expect(formatTodayHeading(date)).toBe("Tuesday, November 24");
  });
});
