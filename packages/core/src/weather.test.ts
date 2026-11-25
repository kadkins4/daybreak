import { describe, expect, it } from "vitest";
import {
  clockMinutes,
  conditionLabel,
  formatClock,
  onDeviceClock,
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

describe("onDeviceClock", () => {
  const sanDiego = {
    date: "2026-11-25",
    place: "San Diego",
    sunrise: 387,
    sunset: 1003,
    high: 73,
    low: 55,
    hourlyTemperature: Array.from({ length: 24 }, (_, hour) => hour),
    hourlyCode: Array.from({ length: 24 }, (_, hour) => hour),
    utcOffsetSeconds: -8 * 3600,
  };

  it("leaves the weather alone on a screen in the same time zone", () => {
    expect(onDeviceClock(sanDiego, -8 * 3600)).toBe(sanDiego);
  });

  it("moves sunrise, sunset and the hours onto a screen three hours ahead", () => {
    const newYork = onDeviceClock(sanDiego, -5 * 3600);
    expect(newYork.sunrise).toBe(387 + 180);
    expect(newYork.sunset).toBe(1003 + 180);
    // 6 pm in New York is 3 pm in San Diego.
    expect(weatherAt(newYork, 18 * 60).temperature).toBe(15);
  });

  it("leaves older saved weather without an offset alone", () => {
    const { utcOffsetSeconds: _, ...old } = sanDiego;
    expect(onDeviceClock(old, -5 * 3600)).toBe(old);
  });
});
