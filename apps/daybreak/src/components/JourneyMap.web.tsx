import { css, placeAt, routePoint } from "@daybreak/core";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./JourneyMap.css";
import { useEffect, useRef, useState } from "react";

import type { JourneyMapProps } from "./JourneyMap";
import {
  BLACK,
  NO_LINE,
  STYLE,
  TEXT,
  expr,
  line,
  mix,
  source,
  type Collection,
} from "./mapKit";

// A little wider than the lower 48, so the map cannot be dragged off them.
const BOUNDS: [[number, number], [number, number]] = [
  [-135, 17],
  [-57, 56],
];
// Everything Daybreak adds to the map has an id that starts with this.
const OURS = "dj-";
const AIRPORTS = `${OURS}airports`;
const ROUTE = `${OURS}route`;
const RING = `${OURS}ring`;
const DOTS = `${OURS}dots`;
const NEAR = `${OURS}near`;
const CHOSEN = `${OURS}chosen`;
const LABELS = `${OURS}labels`;

type Palette = JourneyMapProps["palette"];

const waterOf = (palette: Palette) => css(mix(palette.base, BLACK, 0.45));

/** Repaints the base map in Daybreak's colors for this moment of the day. */
function recolor(map: maplibregl.Map, palette: Palette) {
  // The style is gone while the map is being torn down or reloaded.
  const style = map.getStyle();
  if (!style) return;
  const land = css(mix(palette.base, palette.accent, 0.09));
  const water = waterOf(palette);
  const border = css(palette.accent, 0.5);
  const road = css(mix(palette.accent, TEXT, 0.4), 0.07);
  const name = css(TEXT, 0.5);

  for (const layer of style.layers) {
    if (layer.id.startsWith(OURS)) continue;
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

/** Adds the airports, the route and the length ring, with nothing in them. */
function addOurLayers(map: maplibregl.Map) {
  // Use whichever lettering the base map already loads.
  const lettered = map
    .getStyle()
    .layers.find(
      (layer) => layer.type === "symbol" && layer.layout?.["text-font"]
    );
  const font = (lettered?.layout as { "text-font"?: string[] } | undefined)?.[
    "text-font"
  ] ?? ["Noto Sans Regular"];
  const empty = { type: "FeatureCollection" as const, features: [] };
  map.addSource(AIRPORTS, { type: "geojson", data: empty });
  map.addSource(ROUTE, { type: "geojson", data: NO_LINE });
  map.addSource(RING, { type: "geojson", data: NO_LINE });

  const size = ["get", "size"];
  // Dots grow with the zoom, and with how big the airport is.
  const radius = (extra: number) => [
    "interpolate",
    ["linear"],
    ["zoom"],
    3,
    ["+", extra, ["*", 0.5, size]],
    7,
    ["+", extra + 1.4, ["*", 0.9, size]],
    10,
    ["+", extra + 3, ["*", 1.4, size]],
  ];
  // Far out, only the biggest airports show.
  const fadeSmall = [
    "interpolate",
    ["linear"],
    ["zoom"],
    3.5,
    ["case", [">=", size, 3], 0.9, 0],
    5.2,
    ["case", [">=", size, 2], 0.9, 0],
    6.4,
    0.9,
  ];
  const nothing = ["==", ["get", "code"], ""];

  map.addLayer({
    id: RING,
    type: "line",
    source: RING,
    paint: { "line-width": 1.5, "line-dasharray": [2, 3] },
  });
  map.addLayer({
    id: ROUTE,
    type: "line",
    source: ROUTE,
    layout: { "line-cap": "round" },
    paint: { "line-width": 2, "line-dasharray": [1, 2] },
  });
  map.addLayer({
    id: NEAR,
    type: "circle",
    source: AIRPORTS,
    filter: nothing as maplibregl.FilterSpecification,
    paint: {
      "circle-radius": expr(radius(5)),
      "circle-opacity": 0.22,
      "circle-stroke-width": 1.5,
    },
  });
  map.addLayer({
    id: DOTS,
    type: "circle",
    source: AIRPORTS,
    paint: {
      "circle-radius": expr(radius(0.6)),
      "circle-opacity": expr(fadeSmall),
    },
  });
  map.addLayer({
    id: CHOSEN,
    type: "circle",
    source: AIRPORTS,
    filter: nothing as maplibregl.FilterSpecification,
    paint: {
      "circle-radius": 6,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });
  map.addLayer({
    id: LABELS,
    type: "symbol",
    source: AIRPORTS,
    layout: {
      "text-field": ["get", "code"],
      "text-font": font,
      "text-size": 11.5,
      "text-anchor": "left",
      "text-offset": [0.7, 0],
      "text-letter-spacing": 0.04,
      "text-optional": true,
      // Bigger airports get their label first when there is no room.
      "symbol-sort-key": expr(["-", 3, size]),
    },
    paint: {
      "text-halo-width": 1.6,
      "text-opacity": expr(fadeSmall),
    },
  });
}

/** Paints what Daybreak added, in this moment's colors. */
function paintOurs(map: maplibregl.Map, palette: Palette) {
  if (!map.getLayer(DOTS)) return;
  const accent = css(palette.accent);
  const water = waterOf(palette);
  map.setPaintProperty(RING, "line-color", css(palette.accent, 0.7));
  map.setPaintProperty(ROUTE, "line-color", accent);
  map.setPaintProperty(NEAR, "circle-color", accent);
  map.setPaintProperty(NEAR, "circle-stroke-color", accent);
  map.setPaintProperty(DOTS, "circle-color", css(TEXT));
  map.setPaintProperty(CHOSEN, "circle-color", accent);
  map.setPaintProperty(LABELS, "text-color", css(TEXT, 0.92));
  map.setPaintProperty(LABELS, "text-halo-color", water);
}

/** The dot that marks the Current Airport. */
function hereDot(): HTMLDivElement {
  const dot = document.createElement("div");
  dot.style.cssText =
    "width:14px;height:14px;border-radius:50%;border:2px solid #fff;" +
    "box-sizing:border-box;pointer-events:none";
  return dot;
}

export function JourneyMap({
  centre,
  here,
  palette,
  flights,
  selected,
  onSelect,
  ring,
  trip,
  padding,
}: JourneyMapProps) {
  const clear = useRef(padding);
  clear.current = padding;
  const host = useRef<HTMLDivElement>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  // The map, once its style has loaded and it can be painted and moved.
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const first = useRef(centre);
  const select = useRef(onSelect);
  select.current = onSelect;

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
    made.on("load", () => {
      addOurLayers(made);
      setMap(made);
    });
    made.on("click", (event) => {
      if (!made.getLayer(DOTS)) return;
      const { x, y } = event.point;
      const zoom = made.getZoom();
      const reach = 16;
      const hits = made
        .queryRenderedFeatures(
          [
            [x - reach, y - reach],
            [x + reach, y + reach],
          ],
          { layers: [DOTS] }
        )
        // Dots that have faded out far from the ground cannot be tapped.
        .filter((hit) => {
          const size = Number(hit.properties.size);
          return zoom >= 6.4 || size >= 3 || (zoom >= 5.2 && size >= 2);
        });
      if (hits.length === 0) {
        select.current(null);
        return;
      }
      // Several airports under one finger: move in until they come apart.
      if (hits.length > 1 && zoom < 9) {
        made.easeTo({
          center: event.lngLat,
          zoom: Math.min(zoom + 1.8, 9.5),
          duration: 600,
        });
        return;
      }
      let best = hits[0];
      let bestGap = Infinity;
      for (const hit of hits) {
        const [lon, lat] = (hit.geometry as { coordinates: number[] })
          .coordinates;
        const at = made.project([lon, lat]);
        const gap = Math.hypot(at.x - x, at.y - y);
        if (gap < bestGap) {
          best = hit;
          bestGap = gap;
        }
      }
      select.current(String(best.properties.code));
    });
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
    if (!map) return;
    recolor(map, palette);
    paintOurs(map, palette);
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

  // The airports that can be flown to.
  useEffect(() => {
    if (!map) return;
    const airports = {
      type: "FeatureCollection",
      features: flights.map(({ to, minutes }) => ({
        type: "Feature",
        properties: {
          code: to.code,
          city: to.city,
          size: to.size,
          minutes,
        },
        geometry: {
          type: "Point",
          coordinates: [to.longitude, to.latitude],
        },
      })),
    };
    source(map, AIRPORTS)?.setData(airports as Collection);
  }, [map, flights]);

  // The chosen destination: its dot, its name and the route to it.
  useEffect(() => {
    if (!map) return;
    const chosen = flights.find((flight) => flight.to.code === selected);
    const isChosen = ["==", ["get", "code"], chosen ? chosen.to.code : ""];
    map.setFilter(CHOSEN, isChosen as maplibregl.FilterSpecification);
    map.setLayoutProperty(
      LABELS,
      "text-field",
      expr(["case", isChosen, ["get", "city"], ["get", "code"]])
    );
    map.setLayoutProperty(
      LABELS,
      "symbol-sort-key",
      expr(["case", isChosen, -1, ["-", 3, ["get", "size"]]])
    );
    if (trip && here && !chosen) {
      // A Round Trip: out, around and back.
      const bounds = new maplibregl.LngLatBounds();
      const path = trip.map((place): [number, number] => {
        bounds.extend([place.longitude, place.latitude]);
        return [place.longitude, place.latitude];
      });
      source(map, ROUTE)?.setData(line(path));
      map.fitBounds(bounds, {
        padding: clear.current,
        maxZoom: 9.5,
        duration: 900,
      });
      return;
    }
    if (!chosen || !here) {
      source(map, ROUTE)?.setData(NO_LINE);
      return;
    }
    const steps = 64;
    const path: [number, number][] = [];
    for (let step = 0; step <= steps; step++) {
      const at = routePoint(here, chosen.to, step / steps);
      path.push([at.longitude, at.latitude]);
    }
    source(map, ROUTE)?.setData(line(path));

    // Bring the destination into view when it is off the screen or under
    // the bar or the card.
    const at = map.project([chosen.to.longitude, chosen.to.latitude]);
    const box = map.getContainer().getBoundingClientRect();
    const seen =
      at.x > clear.current.left &&
      at.x < box.width - clear.current.right &&
      at.y > clear.current.top &&
      at.y < box.height - clear.current.bottom;
    if (!seen) {
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([here.longitude, here.latitude]);
      bounds.extend([chosen.to.longitude, chosen.to.latitude]);
      map.fitBounds(bounds, {
        padding: clear.current,
        maxZoom: Math.max(map.getZoom(), 6.6),
        duration: 900,
      });
    }
  }, [map, flights, selected, here, trip]);

  // The ring a chosen length reaches, and the airports near it.
  const ringMiles = ring?.miles ?? null;
  const ringLow = ring?.low ?? 0;
  const ringHigh = ring?.high ?? 0;
  useEffect(() => {
    if (!map) return;
    if (ringMiles === null || !here) {
      source(map, RING)?.setData(NO_LINE);
      map.setFilter(NEAR, ["==", ["get", "code"], ""]);
      return;
    }
    map.setFilter(NEAR, [
      "all",
      [">=", ["get", "minutes"], ringLow],
      ["<=", ["get", "minutes"], ringHigh],
    ]);
    if (ringMiles <= 0) {
      source(map, RING)?.setData(NO_LINE);
      return;
    }
    const path: [number, number][] = [];
    const bounds = new maplibregl.LngLatBounds();
    for (let step = 0; step <= 120; step++) {
      const at = placeAt(here, step * 3, ringMiles);
      path.push([at.longitude, at.latitude]);
      bounds.extend([at.longitude, at.latitude]);
    }
    source(map, RING)?.setData(line(path));
    map.fitBounds(bounds, {
      padding: clear.current,
      maxZoom: 9,
      duration: 900,
    });
  }, [map, here, ringMiles, ringLow, ringHigh]);

  return (
    <div
      ref={host}
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
    />
  );
}
