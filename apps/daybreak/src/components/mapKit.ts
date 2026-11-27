import type { Rgb } from "@daybreak/core";
import type maplibregl from "maplibre-gl";

// Helpers shared by the two Journey maps. Web only, like the maps.

// Free OpenStreetMap tiles from OpenFreeMap. See docs/adr/0010.
export const STYLE = "https://tiles.openfreemap.org/styles/dark";

export const BLACK: Rgb = [0, 0, 0];
export const TEXT: Rgb = [246, 241, 234];

export const mix = (from: Rgb, to: Rgb, amount: number): Rgb => [
  from[0] + (to[0] - from[0]) * amount,
  from[1] + (to[1] - from[1]) * amount,
  from[2] + (to[2] - from[2]) * amount,
];

export type Line = {
  type: "Feature";
  properties: Record<string, never>;
  geometry: { type: "LineString"; coordinates: [number, number][] };
};
export type Collection = Parameters<maplibregl.GeoJSONSource["setData"]>[0];

/** Marks a hand-written map expression as one. */
export const expr = (value: unknown) =>
  value as maplibregl.ExpressionSpecification;

export const line = (coordinates: [number, number][]): Line => ({
  type: "Feature",
  properties: {},
  geometry: { type: "LineString", coordinates },
});
export const NO_LINE = line([]);

// The style is gone while a map is being torn down, and so are its sources.
export const source = (map: maplibregl.Map, id: string) =>
  map.getStyle()
    ? (map.getSource(id) as maplibregl.GeoJSONSource | undefined)
    : undefined;

/** The lettering the base map already loads, for our own labels. */
export function baseFont(map: maplibregl.Map): string[] {
  const lettered = map
    .getStyle()
    .layers.find(
      (layer) => layer.type === "symbol" && layer.layout?.["text-font"]
    );
  return (
    (lettered?.layout as { "text-font"?: string[] } | undefined)?.[
      "text-font"
    ] ?? ["Noto Sans Regular"]
  );
}
