import { describe, expect, it } from "vitest";
import { addDays, dayFor, formatDayHeading } from "./day";

const SAN_DIEGO = "America/Los_Angeles";
const NEW_YORK = "America/New_York";
const TOKYO = "Asia/Tokyo";

describe("dayFor", () => {
  it("keeps 11:59 pm on the same day", () => {
    // 11:59 pm PST on Nov 24
    expect(dayFor(new Date("2026-11-25T07:59:00Z"), SAN_DIEGO)).toBe(
      "2026-11-24"
    );
  });

  it("counts 3:59 am toward the day before", () => {
    // 3:59 am PST on Nov 25
    expect(dayFor(new Date("2026-11-25T11:59:00Z"), SAN_DIEGO)).toBe(
      "2026-11-24"
    );
  });

  it("starts the new day at 4:00 am", () => {
    // 4:00 am PST on Nov 25
    expect(dayFor(new Date("2026-11-25T12:00:00Z"), SAN_DIEGO)).toBe(
      "2026-11-25"
    );
  });

  it("gives the same moment a different day in another time zone", () => {
    // 2:30 am in San Diego, 5:30 am in New York, 7:30 pm in Tokyo
    const moment = new Date("2026-11-25T10:30:00Z");
    expect(dayFor(moment, SAN_DIEGO)).toBe("2026-11-24");
    expect(dayFor(moment, NEW_YORK)).toBe("2026-11-25");
    expect(dayFor(moment, TOKYO)).toBe("2026-11-25");
  });

  it("rolls back across a month and a year", () => {
    // 1:00 am PST on Jan 1
    expect(dayFor(new Date("2027-01-01T09:00:00Z"), SAN_DIEGO)).toBe(
      "2026-12-31"
    );
  });

  it("still changes at 4:00 am on the night the clocks go forward", () => {
    // Mar 14 2027: 2:00 am PST jumps to 3:00 am PDT.
    expect(dayFor(new Date("2027-03-14T10:59:00Z"), SAN_DIEGO)).toBe(
      "2027-03-13"
    ); // 3:59 am PDT
    expect(dayFor(new Date("2027-03-14T11:00:00Z"), SAN_DIEGO)).toBe(
      "2027-03-14"
    ); // 4:00 am PDT
  });

  it("accepts a different rollover time", () => {
    const moment = new Date("2026-11-25T08:30:00Z"); // 12:30 am PST
    expect(dayFor(moment, SAN_DIEGO, 0)).toBe("2026-11-25");
  });
});

describe("addDays", () => {
  it("steps forward and back across month ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("formatDayHeading", () => {
  it("formats a day as weekday, month and day", () => {
    expect(formatDayHeading("2026-11-24")).toBe("Tuesday, November 24");
  });
});
