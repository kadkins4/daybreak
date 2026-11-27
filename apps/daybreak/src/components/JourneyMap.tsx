import type { Airport, Flight, Palette, Place } from "@daybreak/core";
import { Text, View } from "react-native";

import { color, font } from "@/lib/ui";

export interface JourneyMapProps {
  /** Where the map is centred. It moves there when this changes. */
  centre: Place;
  /** The Current Airport, marked on the map. */
  here: Airport | null;
  palette: Palette;
  /** Every flight that can be taken from here. Each shows as a dot. */
  flights: Flight[];
  /** The code of the chosen destination, if there is one. */
  selected: string | null;
  /** Called with a code when an airport is tapped, or null for empty map. */
  onSelect: (code: string | null) => void;
  /**
   * A chosen flight length: how far it reaches in miles, and the shortest
   * and longest flights in minutes that count as near it.
   */
  ring: { miles: number; low: number; high: number } | null;
  /** The path of a chosen Round Trip, drawn when no airport is chosen. */
  trip: Place[] | null;
  /** Screen edges covered by the bar and the cards, kept clear of the route. */
  padding: { top: number; bottom: number; left: number; right: number };
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
