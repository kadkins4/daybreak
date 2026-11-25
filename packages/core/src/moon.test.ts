import { describe, expect, it } from "vitest";
import { moonPhase } from "./moon";

// Published times. Eclipses pin new and full moons to the minute.
const NEW_MOON = new Date("2024-04-08T18:21:00Z"); // total solar eclipse
const FIRST_QUARTER = new Date("2024-04-15T19:13:00Z");
const FULL_MOON = new Date("2025-03-14T06:55:00Z"); // total lunar eclipse
const NEW_MOON_2026 = new Date("2026-08-12T17:37:00Z"); // total solar eclipse

describe("moonPhase", () => {
  it("matches a published new moon", () => {
    const moon = moonPhase(NEW_MOON);
    expect(moon.name).toBe("New moon");
    expect(moon.illumination).toBeLessThan(0.001);
  });

  it("matches a published first quarter", () => {
    const moon = moonPhase(FIRST_QUARTER);
    expect(moon.name).toBe("First quarter");
    expect(moon.waxing).toBe(true);
    expect(moon.illumination).toBeCloseTo(0.5, 2);
    expect(moon.phase).toBeCloseTo(0.25, 2);
  });

  it("matches a published full moon", () => {
    const moon = moonPhase(FULL_MOON);
    expect(moon.name).toBe("Full moon");
    expect(moon.illumination).toBeGreaterThan(0.999);
  });

  it("matches a published new moon two years on", () => {
    const moon = moonPhase(NEW_MOON_2026);
    expect(moon.name).toBe("New moon");
    expect(moon.illumination).toBeLessThan(0.001);
  });

  it("names the phases between", () => {
    const daysAfter = (days: number) =>
      new Date(NEW_MOON.getTime() + days * 86_400_000);
    expect(moonPhase(daysAfter(3.5)).name).toBe("Waxing crescent");
    expect(moonPhase(daysAfter(11)).name).toBe("Waxing gibbous");
    expect(moonPhase(daysAfter(18.5)).name).toBe("Waning gibbous");
    expect(moonPhase(daysAfter(22.3)).name).toBe("Last quarter");
    expect(moonPhase(daysAfter(26)).name).toBe("Waning crescent");
    expect(moonPhase(daysAfter(26)).waxing).toBe(false);
  });
});
