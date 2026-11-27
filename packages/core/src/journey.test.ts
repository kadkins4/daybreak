import { describe, expect, it } from "vitest";
import {
  AIRPORTS,
  airportFor,
  flightMinutes,
  flightsFrom,
  formatFlightTime,
  headingBetween,
  lengthWindow,
  milesForMinutes,
  placeAt,
  milesBetween,
  nearestAirport,
  routePoint,
} from "./journey";

const at = (code: string) => {
  const airport = airportFor(code);
  if (!airport) throw new Error(`No airport ${code}`);
  return airport;
};

describe("AIRPORTS", () => {
  it("holds the lower 48's airline airports, each code once", () => {
    expect(AIRPORTS.length).toBeGreaterThan(400);
    expect(new Set(AIRPORTS.map((airport) => airport.code)).size).toBe(
      AIRPORTS.length
    );
  });

  it("leaves out Alaska and Hawaii", () => {
    expect(airportFor("ANC")).toBeUndefined();
    expect(airportFor("HNL")).toBeUndefined();
  });

  it("finds an airport by code in either case", () => {
    expect(at("bwi").city).toBe("Baltimore");
  });
});

describe("milesBetween", () => {
  it("measures Baltimore to Philadelphia as about 90 miles", () => {
    expect(milesBetween(at("BWI"), at("PHL"))).toBeCloseTo(90, 0);
  });

  it("measures New York to Los Angeles as about 2,470 miles", () => {
    const miles = milesBetween(at("JFK"), at("LAX"));
    expect(miles).toBeGreaterThan(2460);
    expect(miles).toBeLessThan(2480);
  });
});

describe("flightMinutes", () => {
  it("makes Baltimore to Philadelphia a 23 minute flight", () => {
    expect(flightMinutes(milesBetween(at("BWI"), at("PHL")))).toBe(23);
  });

  it("makes New York to Los Angeles a bit over five hours", () => {
    expect(flightMinutes(milesBetween(at("JFK"), at("LAX")))).toBe(308);
  });

  it("has no upper limit", () => {
    expect(flightMinutes(5000)).toBe(612);
  });
});

describe("routePoint", () => {
  it("starts at the origin and ends at the destination", () => {
    const start = routePoint(at("BWI"), at("CLT"), 0);
    const end = routePoint(at("BWI"), at("CLT"), 1);
    expect(milesBetween(start, at("BWI"))).toBeLessThan(0.01);
    expect(milesBetween(end, at("CLT"))).toBeLessThan(0.01);
  });

  it("puts the halfway point the same distance from both ends", () => {
    const middle = routePoint(at("SAN"), at("JFK"), 0.5);
    const total = milesBetween(at("SAN"), at("JFK"));
    expect(milesBetween(at("SAN"), middle)).toBeCloseTo(total / 2, 3);
    expect(milesBetween(middle, at("JFK"))).toBeCloseTo(total / 2, 3);
  });

  it("stays put when both ends are the same place", () => {
    expect(routePoint(at("BWI"), at("BWI"), 0.5)).toEqual({
      latitude: at("BWI").latitude,
      longitude: at("BWI").longitude,
    });
  });
});

describe("headingBetween", () => {
  it("heads north-east from Baltimore to Philadelphia", () => {
    const heading = headingBetween(at("BWI"), at("PHL"));
    expect(heading).toBeGreaterThan(45);
    expect(heading).toBeLessThan(70);
  });

  it("heads south-west from Baltimore to Charlotte", () => {
    const heading = headingBetween(at("BWI"), at("CLT"));
    expect(heading).toBeGreaterThan(215);
    expect(heading).toBeLessThan(235);
  });
});

describe("nearestAirport", () => {
  it("finds San Diego International from downtown San Diego", () => {
    expect(
      nearestAirport({ latitude: 32.7157, longitude: -117.1611 }).code
    ).toBe("SAN");
  });

  it("finds Baltimore from the Inner Harbor", () => {
    expect(
      nearestAirport({ latitude: 39.2854, longitude: -76.6083 }).code
    ).toBe("BWI");
  });
});

describe("milesForMinutes", () => {
  it("undoes flightMinutes", () => {
    expect(flightMinutes(milesForMinutes(45))).toBe(45);
    expect(milesForMinutes(45)).toBeCloseTo(275, 5);
  });

  it("gives zero for a length shorter than the climb", () => {
    expect(milesForMinutes(5)).toBe(0);
  });
});

describe("formatFlightTime", () => {
  it("writes minutes, hours, or both", () => {
    expect(formatFlightTime(23)).toBe("23 min");
    expect(formatFlightTime(120)).toBe("2 h");
    expect(formatFlightTime(308)).toBe("5 h 8 min");
  });
});

describe("placeAt", () => {
  it("lands the given distance away on the given heading", () => {
    const there = placeAt(at("SAN"), 40, 275);
    expect(milesBetween(at("SAN"), there)).toBeCloseTo(275, 3);
    expect(headingBetween(at("SAN"), there)).toBeCloseTo(40, 3);
  });
});

describe("flightsFrom", () => {
  it("lists every other airport, shortest first", () => {
    const flights = flightsFrom(at("BWI"));
    expect(flights.length).toBe(AIRPORTS.length - 1);
    expect(flights[0].to.code).toBe("DCA");
    expect(
      flights.every(
        (flight, i) => i === 0 || flight.miles >= flights[i - 1].miles
      )
    ).toBe(true);
  });
});

describe("lengthWindow", () => {
  it("puts Las Vegas inside a 45 minute ring from San Diego", () => {
    const { low, high } = lengthWindow(45);
    const vegas = flightMinutes(milesBetween(at("SAN"), at("LAS")));
    expect(vegas).toBeGreaterThanOrEqual(low);
    expect(vegas).toBeLessThanOrEqual(high);
  });

  it("widens for long flights", () => {
    expect(lengthWindow(20)).toEqual({ low: 17, high: 23 });
    expect(lengthWindow(300)).toEqual({ low: 276, high: 324 });
  });
});
