import { describe, expect, it } from "vitest";
import {
  STOPS,
  css,
  dialAngle,
  elapsedArc,
  isNight,
  paletteAt,
  stopOffsets,
  type SunTimes,
} from "./sun";

// San Diego in late November: sunrise 6:30 am, sunset 4:44 pm.
const winter: SunTimes = { sunrise: 390, sunset: 1004 };
// San Diego in late June: sunrise 5:42 am, sunset 8:00 pm.
const summer: SunTimes = { sunrise: 342, sunset: 1200 };

describe("dialAngle", () => {
  it("puts noon at the top and midnight at the bottom, clockwise", () => {
    expect(dialAngle(12 * 60)).toBe(0);
    expect(dialAngle(18 * 60)).toBe(90);
    expect(dialAngle(0)).toBe(180);
    expect(dialAngle(6 * 60)).toBe(270);
  });
});

describe("isNight and elapsedArc", () => {
  it("is day from sunrise until sunset", () => {
    expect(isNight(winter.sunrise - 1, winter)).toBe(true);
    expect(isNight(winter.sunrise, winter)).toBe(false);
    expect(isNight(12 * 60, winter)).toBe(false);
    expect(isNight(winter.sunset, winter)).toBe(true);
    expect(isNight(0, winter)).toBe(true);
  });

  it("measures from sunrise by day and from sunset by night", () => {
    expect(elapsedArc(12 * 60, winter)).toEqual({ from: 390, to: 720 });
    expect(elapsedArc(22 * 60, winter)).toEqual({ from: 1004, to: 1320 });
    expect(elapsedArc(2 * 60, winter)).toEqual({ from: 1004, to: 120 });
  });
});

describe("paletteAt", () => {
  it("lands exactly on each stop", () => {
    const offsets = stopOffsets(winter);
    for (const name of Object.keys(STOPS) as (keyof typeof STOPS)[]) {
      const palette = paletteAt(winter.sunrise + offsets[name], winter);
      expect(css(palette.accent)).toBe(css(STOPS[name].accent));
      expect(css(palette.glow)).toBe(css(STOPS[name].glow));
      expect(css(palette.base)).toBe(css(STOPS[name].base));
    }
  });

  it("follows the sun, so summer and winter differ at the same clock time", () => {
    const sixPm = 18 * 60;
    expect(css(paletteAt(sixPm, winter).accent)).not.toBe(
      css(paletteAt(sixPm, summer).accent)
    );
  });

  it("changes smoothly through a whole day with no jumps", () => {
    for (const sun of [winter, summer]) {
      let previous = paletteAt(0, sun);
      for (let minute = 1; minute <= 1440; minute += 1) {
        const current = paletteAt(minute, sun);
        for (const key of ["accent", "glow", "base"] as const) {
          for (let channel = 0; channel < 3; channel += 1) {
            const step = Math.abs(
              current[key][channel] - previous[key][channel]
            );
            expect(step).toBeLessThan(1.5);
          }
        }
        previous = current;
      }
    }
  });

  it("is blue at night and warm by day", () => {
    const [nightRed, , nightBlue] = paletteAt(23 * 60, winter).accent;
    const [dayRed, , dayBlue] = paletteAt(11 * 60, winter).accent;
    expect(nightBlue).toBeGreaterThan(nightRed);
    expect(dayRed).toBeGreaterThan(dayBlue);
  });

  it("keeps the stops in order on very short days and nights", () => {
    for (const sun of [
      { sunrise: 600, sunset: 720 },
      { sunrise: 120, sunset: 1380 },
    ]) {
      const offsets = Object.values(stopOffsets(sun));
      expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
    }
  });
});

describe("css", () => {
  it("writes a color with or without opacity", () => {
    expect(css([255, 180, 107])).toBe("rgb(255, 180, 107)");
    expect(css([255, 180, 107], 0.36)).toBe("rgba(255, 180, 107, 0.36)");
  });
});
