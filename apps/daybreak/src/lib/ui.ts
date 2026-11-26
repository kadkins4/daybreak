import type { TextStyle, ViewStyle } from "react-native";

/** The fixed colors from `docs/design.md`. */
export const color = {
  text: "#f6f1ea",
  muted: "#bdb3a8",
  accentInk: "#1c120a",
  chip: "rgba(255,255,255,0.1)",
  pip: "rgba(255,255,255,0.18)",
  tile: "rgba(26,23,21,0.62)",
  border: "rgba(255,255,255,0.13)",
};

export const font = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
};

/**
 * Styles that React Native's types do not know yet but the web understands,
 * such as the background blur behind a tile.
 */
export const web = (style: Record<string, unknown>) => style as ViewStyle;

/** Raised glass: a lit top edge, a soft shadow, and a blur of what is behind. */
export function tile(radius: number): ViewStyle {
  return {
    backgroundColor: color.tile,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius,
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.14), 0 18px 40px rgba(0,0,0,0.4)",
    ...web({ backdropFilter: "blur(24px)" }),
  };
}

/** A finished Habit: the whole tile tints with the accent and glows. */
export function finishedTile(
  radius: number,
  accent: (opacity?: number) => string,
  glow: (opacity?: number) => string
): ViewStyle {
  return {
    ...tile(radius),
    borderColor: accent(0.55),
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.2), 0 18px 40px rgba(0,0,0,0.4), " +
      `0 0 32px ${glow(0.28)}`,
    ...web({
      backgroundImage: `linear-gradient(160deg, ${accent(0.36)}, ${color.tile} 72%)`,
    }),
  };
}

export const label: TextStyle = {
  fontFamily: font.regular,
  fontSize: 13,
  color: color.muted,
  letterSpacing: 0.5,
  textTransform: "uppercase",
};

/**
 * Stops a long-press from selecting text or opening the browser's menu.
 * iPhone browsers need the prefixed form, and need it on the text itself.
 */
export const noSelect = web({
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
  WebkitTapHighlightColor: "transparent",
});
