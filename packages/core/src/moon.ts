const J2000 = Date.UTC(2000, 0, 1, 12);
const DAY_MS = 86_400_000;

const sin = (degrees: number) => Math.sin((degrees * Math.PI) / 180);
const normalize = (degrees: number) => ((degrees % 360) + 360) % 360;

export type MoonPhaseName =
  | "New moon"
  | "Waxing crescent"
  | "First quarter"
  | "Waxing gibbous"
  | "Full moon"
  | "Waning gibbous"
  | "Last quarter"
  | "Waning crescent";

export interface MoonPhase {
  /** 0 at new moon, 0.25 first quarter, 0.5 full, 0.75 last quarter. */
  phase: number;
  /** The lit share of the disc, 0 to 1. */
  illumination: number;
  /** True while the lit share is growing. */
  waxing: boolean;
  name: MoonPhaseName;
}

/**
 * The angle between the moon and the sun as seen from Earth, in degrees:
 * 0 at new moon, 180 at full. Uses the main terms of the standard
 * low-precision series, good to about a tenth of a degree (a quarter hour).
 */
export function moonElongation(moment: Date): number {
  const d = (moment.getTime() - J2000) / DAY_MS;

  const moonAnomaly = 134.963 + 13.064993 * d;
  const sunAnomaly = 357.529 + 0.98560028 * d;
  const latitudeArg = 93.272 + 13.22935 * d;
  const meanElongation = 297.85 + 12.190749 * d;

  const moonLongitude =
    218.316 +
    13.176396 * d +
    6.289 * sin(moonAnomaly) -
    1.274 * sin(moonAnomaly - 2 * meanElongation) +
    0.658 * sin(2 * meanElongation) +
    0.214 * sin(2 * moonAnomaly) -
    0.186 * sin(sunAnomaly) -
    0.114 * sin(2 * latitudeArg) +
    0.059 * sin(2 * moonAnomaly - 2 * meanElongation) +
    0.057 * sin(moonAnomaly - 2 * meanElongation + sunAnomaly) +
    0.053 * sin(moonAnomaly + 2 * meanElongation) +
    0.046 * sin(2 * meanElongation - sunAnomaly) +
    0.041 * sin(moonAnomaly - sunAnomaly) -
    0.035 * sin(meanElongation) -
    0.031 * sin(moonAnomaly + sunAnomaly);

  const sunLongitude =
    280.46 +
    0.9856474 * d +
    1.915 * sin(sunAnomaly) +
    0.02 * sin(2 * sunAnomaly);

  return normalize(moonLongitude - sunLongitude);
}

const NAMES: MoonPhaseName[] = [
  "New moon",
  "Waxing crescent",
  "First quarter",
  "Waxing gibbous",
  "Full moon",
  "Waning gibbous",
  "Last quarter",
  "Waning crescent",
];

/** The moon's phase at a moment, worked out from the date alone. */
export function moonPhase(moment: Date): MoonPhase {
  const elongation = moonElongation(moment);
  const phase = elongation / 360;
  // Eight equal slices, with each named phase centred on its exact moment.
  const name = NAMES[Math.floor(normalize(elongation + 22.5) / 45)];
  return {
    phase,
    illumination: (1 - Math.cos((elongation * Math.PI) / 180)) / 2,
    waxing: elongation < 180,
    name,
  };
}
