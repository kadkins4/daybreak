import type { Airport, Palette, Place } from "@daybreak/core";
import { Text, View } from "react-native";

import { color, font } from "@/lib/ui";

export interface JourneyMapProps {
  /** Where the map is centred. It moves there when this changes. */
  centre: Place;
  /** The Current Airport, marked on the map. */
  here: Airport | null;
  palette: Palette;
}

/**
 * The Journey map. It is built for the web, which is also what the Device
 * runs. The iPhone app gets its own map when that build starts.
 */
export function JourneyMap(_props: JourneyMapProps) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text
        style={{ fontFamily: font.regular, fontSize: 15, color: color.muted }}
      >
        The Journey map is on the web for now.
      </Text>
    </View>
  );
}
