import { dayFor } from "./day";
import {
  AIRPORTS,
  EARTH_MILES,
  headingBetween,
  milesBetween,
  milesForMinutes,
  placeAt,
  routePoint,
  type Airport,
  type Place,
} from "./journey";

/** The takeoff is the first part of the flight time. */
export const TAKEOFF_SECONDS = 30;
/** The landing is the last part of the flight time. Touchdown is zero. */
export const LANDING_SECONDS = 45;
/** The shortest Round Trip. */
export const SHORTEST_ROUND_TRIP_MINUTES = 5;
/** How close to the route an airport must be to count as passed. */
const DIVERSION_REACH_MILES = 75;
/** Speed at liftoff and touchdown, as a share of cruising speed. */
const SLOW = 0.3;
/** The radius of a Round Trip's U-turn. Short trips turn tighter. */
const TURN_RADIUS_MILES = 5;
/** A short Round Trip flies slowly, at least this many miles a minute. */
const SLOWEST_MILES_A_MINUTE = 2.5;

const radians = (degrees: number) => (degrees * Math.PI) / 180;
const degrees = (value: number) => (value * 180) / Math.PI;
const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

/** What a Journey sets out to fly. */
export interface FlightPlan {
  origin: Airport;
  /** Where it lands, or null for a Round Trip. */
  destination: Airport | null;
  /** The heading a Round Trip sets out on. Null for a one-way flight. */
  outboundHeading: number | null;
  plannedSeconds: number;
  plannedMiles: number;
}

/** Miles a Round Trip of a given length covers. */
export function roundTripMiles(minutes: number): number {
  return Math.max(milesForMinutes(minutes), minutes * SLOWEST_MILES_A_MINUTE);
}

/** Distance covered while speeding up from slow to cruise over `whole`. */
const ramp = (seconds: number, whole: number) =>
  SLOW * seconds + ((1 - SLOW) * seconds * seconds) / (2 * whole);

/**
 * Miles flown after a number of seconds in the air. The plane speeds up
 * through the takeoff and slows down through the landing, so it covers
 * exactly the planned miles at touchdown.
 */
export function milesFlownAt(
  seconds: number,
  plan: Pick<FlightPlan, "plannedSeconds" | "plannedMiles">
): number {
  const whole = plan.plannedSeconds;
  const t = clamp(seconds, 0, whole);
  const up = Math.min(TAKEOFF_SECONDS, whole * 0.4);
  const down = Math.min(LANDING_SECONDS, whole * 0.6);
  const cruise = whole - up - down;
  const total = ramp(up, up) + cruise + ramp(down, down);
  let covered: number;
  if (t <= up) covered = ramp(t, up);
  else if (t <= up + cruise) covered = ramp(up, up) + (t - up);
  else covered = total - ramp(whole - t, down);
  return (covered / total) * plan.plannedMiles;
}

/**
 * How high the plane is, from 0 on the runway to 1 at cruising height. It
 * climbs through the takeoff and comes down through the landing.
 */
export function climbAt(seconds: number, plannedSeconds: number): number {
  const smooth = (x: number) => {
    const c = clamp(x, 0, 1);
    return c * c * (3 - 2 * c);
  };
  if (seconds < TAKEOFF_SECONDS) return smooth(seconds / TAKEOFF_SECONDS);
  const left = plannedSeconds - seconds;
  if (left < LANDING_SECONDS) return smooth(left / LANDING_SECONDS);
  return 1;
}

/** The line a flight follows over the ground. */
export interface FlightPath {
  miles: number;
  /** The place a number of miles along the path. */
  pointAt: (miles: number) => Place;
  /** The way the plane is pointing there: 0 is north, 90 is east. */
  headingAt: (miles: number) => number;
  /** Where a Round Trip's U-turn starts and ends, in miles along. */
  turn: { from: number; to: number } | null;
}

function withHeading(
  miles: number,
  pointAt: (miles: number) => Place,
  turn: FlightPath["turn"]
): FlightPath {
  return {
    miles,
    pointAt,
    turn,
    headingAt: (at) => {
      const step = Math.min(0.5, miles / 4);
      const from = clamp(at, 0, Math.max(0, miles - step));
      return headingBetween(pointAt(from), pointAt(from + step));
    },
  };
}

/**
 * The path of a flight. One way, it is the shortest line to the
 * destination. A Round Trip flies a teardrop: out on one side of its
 * heading, around one U-turn, and straight back to where it took off.
 */
export function pathFor(plan: FlightPlan): FlightPath {
  const { origin, destination } = plan;
  if (destination) {
    const miles = milesBetween(origin, destination);
    return withHeading(
      miles,
      (at) =>
        routePoint(origin, destination, miles ? clamp(at / miles, 0, 1) : 0),
      null
    );
  }

  const miles = plan.plannedMiles;
  const heading = plan.outboundHeading ?? 0;
  const radius = Math.min(TURN_RADIUS_MILES, miles / 10);
  // Flat ground around the origin: x runs along the heading, y to its right.
  // The turn is a circle centred `reach` miles out. Find the reach that makes
  // the two straight legs and the turn add up to the planned miles.
  const lengthFor = (reach: number) =>
    2 * Math.sqrt(reach * reach - radius * radius) +
    radius * (Math.PI + 2 * Math.asin(radius / reach));
  let low = radius;
  let high = Math.max(miles, radius * 2);
  for (let step = 0; step < 60; step++) {
    const middle = (low + high) / 2;
    if (lengthFor(middle) < miles) low = middle;
    else high = middle;
  }
  const reach = (low + high) / 2;
  const leg = Math.sqrt(Math.max(0, reach * reach - radius * radius));
  const lean = Math.asin(Math.min(1, radius / reach));
  const sweep = Math.PI + 2 * lean;
  const arc = radius * sweep;
  // The angle from the turn's centre to where the turn begins.
  const entry = Math.atan2(-Math.cos(lean), -Math.sin(lean));

  const flat = (at: number): [number, number] => {
    const along = clamp(at, 0, miles);
    if (along <= leg) {
      return [along * Math.cos(lean), -along * Math.sin(lean)];
    }
    if (along <= leg + arc) {
      const angle = entry + (along - leg) / radius;
      return [reach + radius * Math.cos(angle), radius * Math.sin(angle)];
    }
    const left = miles - along;
    return [left * Math.cos(lean), left * Math.sin(lean)];
  };

  return withHeading(
    miles,
    (at) => {
      const [x, y] = flat(at);
      const away = Math.hypot(x, y);
      if (away === 0) {
        return { latitude: origin.latitude, longitude: origin.longitude };
      }
      return placeAt(origin, heading + degrees(Math.atan2(y, x)), away);
    },
    { from: leg, to: leg + arc }
  );
}

/**
 * Places along a stretch of a path, close enough together to draw as a
 * line. A U-turn gets extra places so it stays round.
 */
export function pathLine(
  path: FlightPath,
  from = 0,
  to = path.miles,
  steps = 96
): Place[] {
  const marks: number[] = [];
  for (let step = 0; step <= steps; step++) {
    marks.push(from + ((to - from) * step) / steps);
  }
  if (path.turn) {
    for (let step = 0; step <= 36; step++) {
      const at = path.turn.from + ((path.turn.to - path.turn.from) * step) / 36;
      if (at > from && at < to) marks.push(at);
    }
    marks.sort((a, b) => a - b);
  }
  return marks.map(path.pointAt);
}

/** Where a flight that ends early comes down, and the Miles it earns. */
export interface Diversion {
  airport: Airport;
  miles: number;
}

/**
 * The Diversion rule. A one-way flight lands at the last airport it has
 * passed: the one furthest along among those within 75 miles of the route
 * and behind the plane. It earns the Miles to that point. With no airport
 * behind it yet, it is back where it took off with no Miles. A Round Trip
 * lands where it took off and keeps the Miles it has flown.
 */
export function diversionAt(plan: FlightPlan, milesFlown: number): Diversion {
  const { origin, destination } = plan;
  if (!destination) {
    return { airport: origin, miles: Math.max(0, milesFlown) };
  }
  const course = radians(headingBetween(origin, destination));
  let best: Diversion = { airport: origin, miles: 0 };
  for (const airport of AIRPORTS) {
    if (airport.code === origin.code || airport.code === destination.code) {
      continue;
    }
    const away = milesBetween(origin, airport) / EARTH_MILES;
    const offCourse = radians(headingBetween(origin, airport)) - course;
    // Behind the origin, not ahead of it.
    if (Math.cos(offCourse) <= 0) continue;
    const aside = Math.asin(Math.sin(away) * Math.sin(offCourse));
    if (Math.abs(aside) * EARTH_MILES > DIVERSION_REACH_MILES) continue;
    const along =
      Math.acos(clamp(Math.cos(away) / Math.cos(aside), -1, 1)) * EARTH_MILES;
    if (along <= milesFlown && along > best.miles) {
      best = { airport, miles: along };
    }
  }
  return best;
}

/**
 * The heading for a Round Trip. It points at an airport about as far away
 * as the trip flies out, so the route stays over land, and it avoids the
 * headings of recent Round Trips. `pick` is a number from 0 up to 1 that
 * chooses among the airports left.
 */
export function roundTripHeading(
  origin: Airport,
  miles: number,
  recent: number[],
  pick: number
): number {
  const outward = miles / 2;
  const others = AIRPORTS.filter((airport) => airport.code !== origin.code)
    .map((airport) => ({
      heading: headingBetween(origin, airport),
      miles: milesBetween(origin, airport),
    }))
    .sort((a, b) => a.miles - b.miles);
  let options = others.filter((other) => other.miles >= outward).slice(0, 12);
  // Further out than any airport: aim at the furthest ones.
  if (options.length < 3) options = others.slice(-6);
  const apart = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
  const fresh = options.filter((option) =>
    recent.every((heading) => apart(heading, option.heading) > 25)
  );
  const pool = fresh.length > 0 ? fresh : options;
  const index = Math.min(
    pool.length - 1,
    Math.floor(clamp(pick, 0, 1) * pool.length)
  );
  return pool[index].heading;
}

/** The parts of a Journey that say how far through its flight it is. */
export interface FlightClock {
  status: "flying" | "paused" | "landed" | "diverted";
  plannedSeconds: number;
  /** Flying time banked up to the last pause. */
  flownSeconds: number;
  /** When it last started flying, in milliseconds. Null unless flying. */
  resumedAt: number | null;
}

/**
 * Seconds flown at a moment. Only flying time counts, and it never goes
 * past the planned length.
 */
export function secondsFlownAt(clock: FlightClock, now: number): number {
  const sinceResume =
    clock.status === "flying" && clock.resumedAt !== null
      ? Math.max(0, (now - clock.resumedAt) / 1000)
      : 0;
  return Math.min(clock.plannedSeconds, clock.flownSeconds + sinceResume);
}

/** When a flying Journey touches down, in milliseconds. Null if not flying. */
export function touchdownTime(clock: FlightClock): number | null {
  if (clock.status !== "flying" || clock.resumedAt === null) return null;
  return clock.resumedAt + (clock.plannedSeconds - clock.flownSeconds) * 1000;
}

/**
 * True when a Journey paused at one moment should be ended by now, because
 * the day has rolled over since.
 */
export function pausedPastRollover(
  pausedAt: Date,
  now: Date,
  timeZone: string
): boolean {
  return dayFor(pausedAt, timeZone) < dayFor(now, timeZone);
}

/** Miles and airports across every Journey so far. */
export function journeyTotals(
  journeys: {
    origin: string;
    landedAt: string | null;
    milesEarned: number | null;
  }[]
): { miles: number; airports: number } {
  const visited = new Set<string>();
  let miles = 0;
  for (const journey of journeys) {
    visited.add(journey.origin);
    if (journey.landedAt) visited.add(journey.landedAt);
    miles += journey.milesEarned ?? 0;
  }
  return { miles, airports: visited.size };
}

/** Time left as a clock, e.g. "22:41" or "1:02:05". */
export function formatCountdown(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const two = (value: number) => String(value).padStart(2, "0");
  const tail = `${two(minutes)}:${two(whole % 60)}`;
  return hours > 0 ? `${hours}:${tail}` : tail.replace(/^0/, "");
}
