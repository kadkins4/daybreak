import { describe, expect, it } from "vitest";

import {
  LANDING_SECONDS,
  TAKEOFF_SECONDS,
  climbAt,
  diversionAt,
  formatCountdown,
  journeyTotals,
  milesFlownAt,
  pathFor,
  pathLine,
  pausedPastRollover,
  roundTripHeading,
  roundTripMiles,
  secondsFlownAt,
  touchdownTime,
  type FlightPlan,
} from "./flight";
import {
  airportFor,
  flightMinutes,
  headingBetween,
  milesBetween,
} from "./journey";

const airport = (code: string) => {
  const found = airportFor(code);
  if (!found) throw new Error(`No airport ${code}`);
  return found;
};

function oneWay(from: string, to: string): FlightPlan {
  const origin = airport(from);
  const destination = airport(to);
  const miles = milesBetween(origin, destination);
  return {
    origin,
    destination,
    outboundHeading: null,
    plannedSeconds: flightMinutes(miles) * 60,
    plannedMiles: miles,
  };
}

function roundTrip(from: string, minutes: number, heading = 40): FlightPlan {
  return {
    origin: airport(from),
    destination: null,
    outboundHeading: heading,
    plannedSeconds: minutes * 60,
    plannedMiles: roundTripMiles(minutes),
  };
}

describe("milesFlownAt", () => {
  const plan = oneWay("BWI", "PHL");

  it("starts at zero and ends on the planned miles", () => {
    expect(milesFlownAt(0, plan)).toBe(0);
    expect(milesFlownAt(plan.plannedSeconds, plan)).toBeCloseTo(
      plan.plannedMiles,
      6
    );
    expect(milesFlownAt(plan.plannedSeconds + 500, plan)).toBeCloseTo(
      plan.plannedMiles,
      6
    );
  });

  it("is slower through the takeoff and the landing than in cruise", () => {
    const over = (from: number, to: number) =>
      milesFlownAt(to, plan) - milesFlownAt(from, plan);
    const cruise = over(600, 610);
    expect(over(0, 10)).toBeLessThan(cruise * 0.6);
    const end = plan.plannedSeconds;
    expect(over(end - 10, end)).toBeLessThan(cruise * 0.6);
  });

  it("never goes backwards", () => {
    let last = 0;
    for (let second = 0; second <= plan.plannedSeconds; second += 7) {
      const miles = milesFlownAt(second, plan);
      expect(miles).toBeGreaterThanOrEqual(last);
      last = miles;
    }
  });
});

describe("climbAt", () => {
  it("is on the ground at both ends and up high in between", () => {
    expect(climbAt(0, 1380)).toBe(0);
    expect(climbAt(TAKEOFF_SECONDS, 1380)).toBe(1);
    expect(climbAt(700, 1380)).toBe(1);
    expect(climbAt(1380 - LANDING_SECONDS / 2, 1380)).toBeCloseTo(0.5, 5);
    expect(climbAt(1380, 1380)).toBe(0);
  });
});

describe("pathFor", () => {
  it("flies one way from the origin to the destination", () => {
    const plan = oneWay("BWI", "PHL");
    const path = pathFor(plan);
    expect(path.miles).toBeCloseTo(90, 0);
    expect(path.turn).toBeNull();
    expect(milesBetween(path.pointAt(0), plan.origin)).toBeCloseTo(0, 5);
    expect(milesBetween(path.pointAt(path.miles), airport("PHL"))).toBeCloseTo(
      0,
      5
    );
    expect(path.headingAt(10)).toBeCloseTo(
      headingBetween(plan.origin, airport("PHL")),
      0
    );
  });

  it("flies a Round Trip out, around a U-turn, and back to the start", () => {
    const plan = roundTrip("SAN", 20);
    const path = pathFor(plan);
    expect(path.miles).toBeCloseTo(plan.plannedMiles, 6);
    expect(milesBetween(path.pointAt(path.miles), plan.origin)).toBeCloseTo(
      0,
      3
    );
    // Half way round, it is out along its heading.
    const far = path.pointAt(path.miles / 2);
    expect(milesBetween(plan.origin, far)).toBeGreaterThan(25);
    expect(headingBetween(plan.origin, far)).toBeCloseTo(40, 0);
    // It comes home pointing nearly the opposite way to how it left.
    const turned = (path.headingAt(path.miles) - path.headingAt(0) + 360) % 360;
    expect(turned).toBeGreaterThan(180);
    expect(turned).toBeLessThan(230);
    expect(path.turn).not.toBeNull();
  });

  it("has no jumps along a Round Trip", () => {
    const path = pathFor(roundTrip("DEN", 5));
    for (let at = 0; at < path.miles; at += 0.25) {
      const step = milesBetween(path.pointAt(at), path.pointAt(at + 0.25));
      expect(step).toBeLessThan(0.3);
    }
  });

  it("draws a line with extra places around the turn", () => {
    const path = pathFor(roundTrip("SAN", 180));
    expect(pathLine(path).length).toBeGreaterThan(110);
    expect(pathLine(pathFor(oneWay("BWI", "PHL")), 0, 40, 10)).toHaveLength(11);
  });
});

describe("roundTripMiles", () => {
  it("follows the flight formula for longer trips", () => {
    expect(roundTripMiles(60)).toBe(400);
  });

  it("still covers ground on the shortest trip", () => {
    expect(roundTripMiles(5)).toBe(12.5);
  });
});

describe("diversionAt", () => {
  const south = oneWay("BWI", "MIA");

  it("lands at the last airport passed, with the Miles to it", () => {
    // Richmond is about 120 miles down this route.
    const landing = diversionAt(south, 130);
    expect(landing.airport.code).toBe("RIC");
    expect(landing.miles).toBeGreaterThan(110);
    expect(landing.miles).toBeLessThan(130);
  });

  it("goes back to the origin with no Miles when nothing is passed", () => {
    const landing = diversionAt(south, 8);
    expect(landing.airport.code).toBe("BWI");
    expect(landing.miles).toBe(0);
  });

  it("ignores airports far off to the side of the route", () => {
    // Pittsburgh is about 180 miles from this route.
    for (let miles = 0; miles < south.plannedMiles; miles += 20) {
      expect(diversionAt(south, miles).airport.code).not.toBe("PIT");
    }
  });

  it("lands a Round Trip where it took off, with the Miles flown", () => {
    const landing = diversionAt(roundTrip("SAN", 45), 61.5);
    expect(landing.airport.code).toBe("SAN");
    expect(landing.miles).toBe(61.5);
  });
});

describe("roundTripHeading", () => {
  const origin = airport("BWI");

  it("points at an airport, not out to sea", () => {
    const heading = roundTripHeading(origin, 200, [], 0);
    expect(heading).toBeGreaterThanOrEqual(0);
    expect(heading).toBeLessThan(360);
    // Nothing is east of Baltimore but the Atlantic.
    const san = roundTripHeading(airport("SAN"), 400, [], 0);
    expect(san).toBeLessThan(180);
  });

  it("avoids the headings of recent Round Trips", () => {
    const used: number[] = [];
    for (let trip = 0; trip < 4; trip++) {
      const heading = roundTripHeading(origin, 200, used, 0);
      for (const before of used) {
        const apart = Math.abs(((heading - before + 540) % 360) - 180);
        expect(apart).toBeGreaterThan(25);
      }
      used.push(heading);
    }
  });

  it("still gives a heading for a trip longer than the country", () => {
    const heading = roundTripHeading(origin, 9000, [], 0.5);
    expect(Number.isFinite(heading)).toBe(true);
  });
});

describe("the flight clock", () => {
  const start = Date.UTC(2026, 10, 27, 15, 0, 0);

  it("counts only flying time", () => {
    const flying = {
      status: "flying" as const,
      plannedSeconds: 1380,
      flownSeconds: 200,
      resumedAt: start,
    };
    expect(secondsFlownAt(flying, start + 60_000)).toBe(260);
    const paused = { ...flying, status: "paused" as const, resumedAt: null };
    expect(secondsFlownAt(paused, start + 60_000)).toBe(200);
  });

  it("stops at the planned length", () => {
    const flying = {
      status: "flying" as const,
      plannedSeconds: 1380,
      flownSeconds: 0,
      resumedAt: start,
    };
    expect(secondsFlownAt(flying, start + 5_000_000)).toBe(1380);
  });

  it("knows when a flying Journey touches down", () => {
    const flying = {
      status: "flying" as const,
      plannedSeconds: 1380,
      flownSeconds: 380,
      resumedAt: start,
    };
    expect(touchdownTime(flying)).toBe(start + 1_000_000);
    expect(
      touchdownTime({ ...flying, status: "paused", resumedAt: null })
    ).toBeNull();
  });
});

describe("pausedPastRollover", () => {
  const zone = "America/New_York";
  // 11:30 pm on November 27, New York time.
  const paused = new Date("2026-11-28T04:30:00Z");

  it("is false before 4:00 am", () => {
    expect(
      pausedPastRollover(paused, new Date("2026-11-28T08:59:00Z"), zone)
    ).toBe(false);
  });

  it("is true from 4:00 am", () => {
    expect(
      pausedPastRollover(paused, new Date("2026-11-28T09:00:00Z"), zone)
    ).toBe(true);
  });
});

describe("journeyTotals", () => {
  it("adds up Miles and counts each airport once", () => {
    expect(
      journeyTotals([
        { origin: "BWI", landedAt: "PHL", milesEarned: 90 },
        { origin: "PHL", landedAt: "PHL", milesEarned: 66.5 },
        { origin: "PHL", landedAt: "BWI", milesEarned: 90 },
        { origin: "BWI", landedAt: null, milesEarned: null },
      ])
    ).toEqual({ miles: 246.5, airports: 2 });
  });
});

describe("formatCountdown", () => {
  it("shows minutes and seconds, then hours when there are any", () => {
    expect(formatCountdown(1361)).toBe("22:41");
    expect(formatCountdown(59.2)).toBe("1:00");
    expect(formatCountdown(8)).toBe("0:08");
    expect(formatCountdown(3725)).toBe("1:02:05");
    expect(formatCountdown(-4)).toBe("0:00");
  });
});
