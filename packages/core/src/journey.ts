import { AIRPORT_ROWS } from "./airports.data";

/** A place on the map, in degrees. */
export type Place = { latitude: number; longitude: number };

/** An airport a Journey can take off from or land at. */
export type Airport = Place & {
  /** The three-letter code, e.g. "BWI". */
  code: string;
  name: string;
  city: string;
  /** The two-letter state, e.g. "MD". */
  state: string;
  /** 3 for the biggest airports, down to 1 for the smallest. */
  size: number;
};

/** Every airport in the lower 48 states with scheduled airline service. */
export const AIRPORTS: readonly Airport[] = AIRPORT_ROWS.map(
  ([code, name, city, state, latitude, longitude, size]) => ({
    code,
    name,
    city,
    state,
    latitude,
    longitude,
    size,
  })
);

const byCode = new Map(AIRPORTS.map((airport) => [airport.code, airport]));

/** The airport with a code, or undefined when there is none. */
export function airportFor(code: string): Airport | undefined {
  return byCode.get(code.toUpperCase());
}

const EARTH_MILES = 3958.8;
const CRUISE_MPH = 500;
/** Minutes a flight spends climbing and coming down, whatever its length. */
const CLIMB_AND_DESCENT_MINUTES = 12;

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const degrees = (value: number) => (value * 180) / Math.PI;

/** The angle between two places as seen from the Earth's centre. */
function arcBetween(from: Place, to: Place): number {
  const lat1 = radians(from.latitude);
  const lat2 = radians(to.latitude);
  const dLat = lat2 - lat1;
  const dLon = radians(to.longitude - from.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Miles between two places along the shortest path over the Earth. */
export function milesBetween(from: Place, to: Place): number {
  return arcBetween(from, to) * EARTH_MILES;
}

/**
 * How long a flight of a given distance takes, in whole minutes: a fixed
 * allowance for the climb and descent, plus the distance at cruising speed.
 */
export function flightMinutes(miles: number): number {
  return Math.round(CLIMB_AND_DESCENT_MINUTES + (miles / CRUISE_MPH) * 60);
}

/**
 * The place a fraction of the way along the route between two places.
 * Zero is the start and one is the end.
 */
export function routePoint(from: Place, to: Place, fraction: number): Place {
  const arc = arcBetween(from, to);
  if (arc === 0) return { latitude: from.latitude, longitude: from.longitude };
  const lat1 = radians(from.latitude);
  const lon1 = radians(from.longitude);
  const lat2 = radians(to.latitude);
  const lon2 = radians(to.longitude);
  const a = Math.sin((1 - fraction) * arc) / Math.sin(arc);
  const b = Math.sin(fraction * arc) / Math.sin(arc);
  const x =
    a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
  const y =
    a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
  const z = a * Math.sin(lat1) + b * Math.sin(lat2);
  return {
    latitude: degrees(Math.atan2(z, Math.hypot(x, y))),
    longitude: degrees(Math.atan2(y, x)),
  };
}

/**
 * The compass heading to set out on from one place to reach another, in
 * degrees: 0 is north, 90 is east.
 */
export function headingBetween(from: Place, to: Place): number {
  const lat1 = radians(from.latitude);
  const lat2 = radians(to.latitude);
  const dLon = radians(to.longitude - from.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}

/** The airport closest to a place. */
export function nearestAirport(place: Place): Airport {
  let best = AIRPORTS[0];
  let bestMiles = Infinity;
  for (const airport of AIRPORTS) {
    const miles = milesBetween(place, airport);
    if (miles < bestMiles) {
      best = airport;
      bestMiles = miles;
    }
  }
  return best;
}
