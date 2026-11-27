import Svg, { Path } from "react-native-svg";

const PATHS = {
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  drop: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
  sparkle: "M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z",
  walk: "M13 4.5a1.5 1.5 0 1 0 .01 0M9 21l2.5-6.5L9.5 12l1-4.5 3 1.5 1.5 3 3 1M7.5 13l1-4 2-1.5M13 15l2 2.5.5 3.5",
  book: "M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5zM12 6v13",
  ring: "M12 5a7 7 0 1 0 .01 0",
  check: "M5 12.5l4.5 4.5L19 7",
  play: "M8 5.5v13l11-6.5z",
  journey: "M3 11l18-8-7 18-3-7z",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  up: "M5 15l7-7 7 7",
  down: "M5 9l7 7 7-7",
  plus: "M12 5v14M5 12h14",
  list: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  close: "M6 6l12 12M18 6L6 18",
  pause: "M9 5v14M15 5v14",
  sound: "M4 10v4h3l5 4V6l-5 4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11",
  mute: "M4 10v4h3l5 4V6l-5 4zM16 9.5l5 5M21 9.5l-5 5",
  plane:
    "M12 2.5l1.8 6 7.2 5v2l-7.2-2-.5 5 2.2 1.8v1.2L12 20.5l-3.5 1v-1.2l2.2-1.8-.5-5-7.2 2v-2l7.2-5z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 24,
  color,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <Path d={PATHS[name]} />
    </Svg>
  );
}

/** Picks an icon for a Habit from the words in its name. */
export function habitIcon(name: string): IconName {
  const text = name.toLowerCase();
  if (/work ?out|exercise|gym|lift|train/.test(text)) return "bolt";
  if (/water|drink|hydrat/.test(text)) return "drop";
  if (/walk|run|step|hike/.test(text)) return "walk";
  if (/face|teeth|skin|brush|floss|shower/.test(text)) return "sparkle";
  if (/read|book|study|journal|write/.test(text)) return "book";
  return "ring";
}
