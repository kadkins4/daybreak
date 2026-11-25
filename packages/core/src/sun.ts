const DAY = 1440;

const wrap = (minutes: number) => ((minutes % DAY) + DAY) % DAY;

/** Sunrise and sunset as minutes since local midnight. */
export interface SunTimes {
  sunrise: number;
  sunset: number;
}

/** Used until the weather arrives: 6:30 am to 5:30 pm. */
export const FALLBACK_SUN_TIMES: SunTimes = { sunrise: 390, sunset: 1050 };

/**
 * Where a time of day sits on the Sun Dial, in degrees clockwise from the
 * top. Noon is at the top and midnight at the bottom.
 */
export function dialAngle(minutes: number): number {
  return wrap(minutes - DAY / 2) / 4;
}

/** True between sunset and the next sunrise. */
export function isNight(minutes: number, sun: SunTimes): boolean {
  return wrap(minutes - sun.sunrise) >= wrap(sun.sunset - sun.sunrise);
}

/**
 * The elapsed stretch of the dial: from sunrise to now during the day, from
 * sunset to now at night. Both ends are minutes since local midnight.
 */
export function elapsedArc(
  minutes: number,
  sun: SunTimes
): { from: number; to: number } {
  return {
    from: isNight(minutes, sun) ? sun.sunset : sun.sunrise,
    to: wrap(minutes),
  };
}

export type Rgb = readonly [number, number, number];

export interface Palette {
  accent: Rgb;
  glow: Rgb;
  base: Rgb;
}

export type StopName =
  "dawn" | "morning" | "midday" | "sunset" | "evening" | "lateNight";

function hex(value: string): Rgb {
  const n = parseInt(value.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/** The six stops from `docs/design.md`. */
export const STOPS: Record<StopName, Palette> = {
  dawn: { accent: hex("#ffb3a1"), glow: hex("#d9647a"), base: hex("#0b0a09") },
  morning: {
    accent: hex("#ffb46b"),
    glow: hex("#e8923f"),
    base: hex("#0b0a09"),
  },
  midday: {
    accent: hex("#ffd166"),
    glow: hex("#e0a63a"),
    base: hex("#0b0a09"),
  },
  sunset: {
    accent: hex("#ff9480"),
    glow: hex("#cf4f7c"),
    base: hex("#0b0a09"),
  },
  evening: {
    accent: hex("#a9b8ff"),
    glow: hex("#6a4fc0"),
    base: hex("#08080c"),
  },
  lateNight: {
    accent: hex("#8fb4ff"),
    glow: hex("#2c4aa8"),
    base: hex("#07080d"),
  },
};

/**
 * When each stop falls, as minutes after sunrise. They follow the sun rather
 * than the clock, so summer and winter differ. On very short days or nights
 * the in-between stops squeeze up so the order never changes.
 */
export function stopOffsets(sun: SunTimes): Record<StopName, number> {
  const dayLength = wrap(sun.sunset - sun.sunrise);
  const nightLength = DAY - dayLength;
  return {
    dawn: 0,
    morning: Math.min(90, dayLength * 0.3),
    midday: dayLength / 2,
    sunset: dayLength,
    evening: dayLength + Math.min(210, nightLength * 0.4),
    lateNight: dayLength + nightLength / 2,
  };
}

const ORDER: StopName[] = [
  "dawn",
  "morning",
  "midday",
  "sunset",
  "evening",
  "lateNight",
];

function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  ];
}

/**
 * The accent, glow and base colors for a time of day: a smooth blend between
 * the two nearest stops, wrapping from late night back round to dawn.
 */
export function paletteAt(minutes: number, sun: SunTimes): Palette {
  const offsets = stopOffsets(sun);
  const sinceSunrise = wrap(minutes - sun.sunrise);

  let index = ORDER.length - 1;
  while (index > 0 && offsets[ORDER[index]] > sinceSunrise) index -= 1;

  const from = ORDER[index];
  const to = ORDER[(index + 1) % ORDER.length];
  const start = offsets[from];
  const end = index === ORDER.length - 1 ? DAY : offsets[to];
  const amount = end > start ? (sinceSunrise - start) / (end - start) : 0;

  return {
    accent: mix(STOPS[from].accent, STOPS[to].accent, amount),
    glow: mix(STOPS[from].glow, STOPS[to].glow, amount),
    base: mix(STOPS[from].base, STOPS[to].base, amount),
  };
}

/** A color as CSS, with an optional opacity from 0 to 1. */
export function css(color: Rgb, opacity = 1): string {
  const [r, g, b] = color.map(Math.round);
  return opacity >= 1
    ? `rgb(${r}, ${g}, ${b})`
    : `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
