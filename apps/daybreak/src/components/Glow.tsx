import { Platform, View } from "react-native";

import { useSky } from "@/lib/sky";
import { web } from "@/lib/ui";

/**
 * The screen background: the base color with a glow rising from the bottom.
 * It is fixed to the screen, so content scrolls over it.
 */
export function Glow() {
  const { glow, base } = useSky();
  return (
    <View
      pointerEvents="none"
      style={[
        { top: 0, right: 0, bottom: 0, left: 0, backgroundColor: base },
        web({
          position: Platform.OS === "web" ? "fixed" : "absolute",
          backgroundImage:
            "radial-gradient(120% 75% at 50% 118%, " +
            `${glow()} 0%, ${glow(0.42)} 26%, ${glow(0)} 62%)`,
        }),
      ]}
    />
  );
}
