import { View } from "react-native";
import Svg, { Circle, Text as SvgText } from "react-native-svg";

import { color, font } from "@/lib/ui";

/**
 * The Daybreak logo: the word in Inter with the sun peeking past the
 * shoulder of the D, as in the app icon. The sun takes the accent color, so
 * it follows the sun like the rest of the screen.
 */
export function Wordmark({
  size = 36,
  accent,
  base,
}: {
  /** The font size the word is drawn at. */
  size?: number;
  accent: string;
  /** The color behind the logo, used to cut the T out of the sun. */
  base: string;
}) {
  const text = {
    x: 2,
    y: 40,
    fontSize: 36,
    fontFamily: font.semibold,
    fontWeight: "600",
  } as const;
  return (
    <View
      accessibilityRole="header"
      accessibilityLabel="Daybreak"
      style={{ width: (190 * size) / 36, height: (52 * size) / 36 }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 190 52" aria-hidden>
        <Circle cx={26} cy={14} r={10} fill={accent} />
        {/* A dark edge first, so the letter stays clear of the sun. */}
        <SvgText
          {...text}
          fill={base}
          stroke={base}
          strokeWidth={7}
          strokeLinejoin="round"
        >
          Daybreak
        </SvgText>
        <SvgText {...text} fill={color.text}>
          Daybreak
        </SvgText>
      </Svg>
    </View>
  );
}
