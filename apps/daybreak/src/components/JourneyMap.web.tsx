import { css, type Rgb } from "@daybreak/core";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./JourneyMap.css";
import { useEffect, useRef, useState } from "react";

import type { JourneyMapProps } from "./JourneyMap";

// Free OpenStreetMap tiles from OpenFreeMap. See docs/adr/0010.
const STYLE = "https://tiles.openfreemap.org/styles/dark";
// A little wider than the lower 48, so the map cannot be dragged off them.
const BOUNDS: [[number, number], [number, number]] = [
  [-135, 17],
  [-57, 56],
];

const mix = (from: Rgb, to: Rgb, amount: number): Rgb => [
  from[0] + (to[0] - from[0]) * amount,
  from[1] + (to[1] - from[1]) * amount,
  from[2] + (to[2] - from[2]) * amount,
];

const BLACK: Rgb = [0, 0, 0];
const TEXT: Rgb = [246, 241, 234];

/** Repaints the map in Daybreak's colors for this moment of the day. */
function recolor(map: maplibregl.Map, palette: JourneyMapProps["palette"]) {
  const land = css(mix(palette.base, palette.accent, 0.09));
  const water = css(mix(palette.base, BLACK, 0.45));
  const border = css(palette.accent, 0.5);
  const road = css(mix(palette.accent, TEXT, 0.4), 0.07);
  const name = css(TEXT, 0.74);

  // The style is gone while the map is being torn down or reloaded.
  const style = map.getStyle();
  if (!style) return;
  for (const layer of style.layers) {
    const kind = "source-layer" in layer ? layer["source-layer"] : undefined;
    const hide = () => map.setLayoutProperty(layer.id, "visibility", "none");
    if (layer.type === "background") {
      map.setPaintProperty(layer.id, "background-color", land);
    } else if (layer.type === "fill") {
      if (kind !== "water") hide();
      else {
        map.setPaintProperty(layer.id, "fill-color", water);
        map.setPaintProperty(layer.id, "fill-opacity", 1);
      }
    } else if (layer.type === "line") {
      if (kind === "transportation") {
        map.setPaintProperty(layer.id, "line-color", road);
      } else if (kind === "boundary") {
        map.setPaintProperty(layer.id, "line-color", border);
      } else hide();
    } else if (layer.type === "symbol") {
      if (kind !== "place") hide();
      else {
        map.setPaintProperty(layer.id, "text-color", name);
        map.setPaintProperty(layer.id, "text-halo-color", water);
        map.setPaintProperty(layer.id, "text-halo-width", 1.4);
      }
    } else hide();
  }
}

/** The dot that marks the Current Airport. */
function hereDot(): HTMLDivElement {
  const dot = document.createElement("div");
  dot.style.cssText =
    "width:14px;height:14px;border-radius:50%;border:2px solid #fff;" +
    "box-sizing:border-box;pointer-events:none";
  return dot;
}

export function JourneyMap({ centre, here, palette }: JourneyMapProps) {
  const host = useRef<HTMLDivElement>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  // The map, once its style has loaded and it can be painted and moved.
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const first = useRef(centre);

  useEffect(() => {
    if (!host.current) return;
    const made = new maplibregl.Map({
      container: host.current,
      style: STYLE,
      center: [first.current.longitude, first.current.latitude],
      zoom: 6.6,
      minZoom: 3,
      maxZoom: 11,
      maxBounds: BOUNDS,
      // North stays up while picking. Turning comes with the flight.
      dragRotate: false,
      pitchWithRotate: false,
      maxPitch: 0,
      attributionControl: { compact: true },
    });
    made.touchZoomRotate.disableRotation();
    made.keyboard.disableRotation();
    made.on("load", () => setMap(made));
    return () => {
      marker.current = null;
      setMap(null);
      made.remove();
    };
  }, []);

  // The palette shifts a little every minute. Repaint only when the
  // rounded colors change.
  const paint = css(palette.base) + css(palette.accent);
  useEffect(() => {
    if (map) recolor(map, palette);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, paint]);

  const { latitude, longitude } = centre;
  useEffect(() => {
    map?.easeTo({ center: [longitude, latitude], duration: 900 });
  }, [map, latitude, longitude]);

  const accent = css(palette.accent);
  useEffect(() => {
    if (!map) return;
    if (!here) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      marker.current = new maplibregl.Marker({ element: hereDot() });
    }
    const dot = marker.current.getElement();
    dot.style.backgroundColor = accent;
    dot.style.boxShadow = `0 0 0 6px ${css(palette.accent, 0.28)}`;
    marker.current.setLngLat([here.longitude, here.latitude]).addTo(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, here, accent]);

  return (
    <div
      ref={host}
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
    />
  );
}
