import { describe, expect, it } from "vitest";
import {
  clockMinutes,
  conditionLabel,
  formatClock,
  weatherAt,
} from "./weather";

describe("conditionLabel", () => {
  it("calls a clear sky sunny by day and clear at night", () => {
    expect(conditionLabel(0, false)).toBe("Sunny");
    expect(conditionLabel(0, true)).toBe("Clear");
  });

  it("names the common conditions", () => {
    expect(conditionLabel(2, false)).toBe("Partly cloudy");
    expect(conditionLabel(3, false)).toBe("Cloudy");
    expect(conditionLabel(48, false)).toBe("Foggy");
    expect(conditionLabel(63, false)).toBe("Rain");
    expect(conditionLabel(81, true)).toBe("Showers");
    expect(conditionLabel(96, false)).toBe("Thunderstorms");
  });
});

describe("clock helpers", () => {
  it("reads minutes from a local timestamp", () => {
    expect(clockMinutes("2026-11-25T06:24")).toBe(384);
    expect(clockMinutes("2026-11-25T16:44")).toBe(1004);
  });

  it("formats minutes as a 12-hour time", () => {
    expect(formatClock(384)).toBe("6:24");
    expect(formatClock(1004)).toBe("4:44");
    expect(formatClock(462, true)).toBe("7:42 AM");
    expect(formatClock(0, true)).toBe("12:00 AM");
    expect(formatClock(1215.5, true)).toBe("8:15 PM");
  });
});

describe("weatherAt", () => {
  it("reads the current hour from the day's values", () => {
    const hourlyTemperature = Array.from(
      { length: 24 },
      (_, hour) => 50 + hour
    );
    const hourlyCode = Array.from({ length: 24 }, (_, hour) =>
      hour < 12 ? 0 : 3
    );
    const day = { hourlyTemperature, hourlyCode };
    expect(weatherAt(day, 7 * 60 + 42)).toEqual({ temperature: 57, code: 0 });
    expect(weatherAt(day, 23 * 60 + 59)).toEqual({ temperature: 73, code: 3 });
  });
});
