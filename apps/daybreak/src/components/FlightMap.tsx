import type { FlightPlan, Palette } from "@daybreak/core";
import { View } from "react-native";

export interface FlightMapProps {
  plan: FlightPlan;
  palette: Palette;
  night: boolean;
  /** Seconds flown at this moment. Asked for on every frame. */
  secondsFlown: () => number;
  /** True to turn the map so the plane always points up. */
  headingUp: boolean;
  /** Screen edges covered by the bar and the strip. */
  padding: { top: number; bottom: number; left: number; right: number };
}

/**
 * The close map that follows the plane. It is built for the web, which is
 * also what the Device runs. Elsewhere the flight still counts down.
 */
export function FlightMap(_props: FlightMapProps) {
  return <View style={{ flex: 1 }} />;
}
