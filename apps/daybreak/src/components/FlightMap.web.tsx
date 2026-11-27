import {
  AIRPORTS,
  climbAt,
  css,
  milesFlownAt,
  pathFor,
  pathLine,
  type Palette,
  type Place,
} from "@daybreak/core";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./JourneyMap.css";
import { useEffect, useMemo, useRef, useState } from "react";

import type { FlightMapProps } from "./FlightMap";
import {
  BLACK,
  STYLE,
  TEXT,
  baseFont,
  expr,
  line,
  mix,
  source,
  type Collection,
} from "./mapKit";

// Everything Daybreak adds to the map has an id that starts with this.
const OURS = "df-";
const GLOW = `${OURS}glow-`;
const ROUTE = `${OURS}route`;
const FLOWN = `${OURS}flown`;
const AIRPORT_DOTS = `${OURS}airports`;
const AIRPORT_NAMES = `${OURS}airport-names`;

/** Miles the map shows from top to bottom while cruising. */
const MILES_TALL = 60;
/** How much closer the map is on the runway than at cruising height. */
const RUNWAY_ZOOM = 2.6;
/** How long a tap shows the whole route for, in milliseconds. */
const PEEK_MS = 4500;
const EASE_MS = 900;

const FAR_FADE = [
  "interpolate",
  ["linear"],
  ["zoom"],
  4,
  ["case", [">=", ["get", "size"], 3], 1, 0],
  5.5,
  ["case", [">=", ["get", "size"], 2], 1, 0],
  7,
  1,
];

const lngLat = (place: Place): [number, number] => [
  place.longitude,
  place.latitude,
];

/** The zoom that fits a number of miles into the height of the map. */
function zoomFor(latitude: number, height: number): number {
  const metres = MILES_TALL * 1609.344;
  const atZoomZero = 78271.517 * Math.cos((latitude * Math.PI) / 180);
  return Math.log2((atZoomZero * Math.max(200, height)) / metres);
}

/** Paints the map as country seen from the air at this moment of the day. */
function recolor(map: maplibregl.Map, palette: Palette, night: boolean) {
  // The style is gone while the map is being torn down or reloaded.
  const style = map.getStyle();
  if (!style) return;
  const land = css(mix(palette.base, BLACK, 0.35));
  const water = css(mix(palette.base, BLACK, 0.7));
  const road = css(mix(palette.accent, TEXT, 0.35));
  const border = css(palette.accent, 0.3);
  const name = css(TEXT, 0.5);
  const accent = css(palette.accent);

  for (const layer of style.layers) {
    const kind = "source-layer" in layer ? layer["source-layer"] : undefined;
    const hide = () => map.setLayoutProperty(layer.id, "visibility", "none");
    if (layer.id.startsWith(GLOW)) {
      map.setPaintProperty(layer.id, "line-color", road);
      map.setPaintProperty(layer.id, "line-opacity", night ? 0.09 : 0.04);
    } else if (layer.id.startsWith(OURS)) continue;
    else if (layer.type === "background") {
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
        map.setPaintProperty(layer.id, "line-opacity", night ? 0.5 : 0.3);
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
  map.setPaintProperty(ROUTE, "line-color", accent);
  map.setPaintProperty(FLOWN, "line-color", accent);
  map.setPaintProperty(AIRPORT_DOTS, "circle-color", css(TEXT, 0.85));
  map.setPaintProperty(AIRPORT_DOTS, "circle-stroke-color", water);
  map.setPaintProperty(AIRPORT_NAMES, "text-color", css(TEXT, 0.72));
  map.setPaintProperty(AIRPORT_NAMES, "text-halo-color", water);
}

/** Adds the road glow, the route and the airports. */
function addOurLayers(map: maplibregl.Map) {
  const layers = map.getStyle().layers;
  const firstName = layers.find((layer) => layer.type === "symbol")?.id;
  // A soft, wide copy of every road under the names, so towns read as light.
  for (const layer of layers) {
    if (layer.type !== "line") continue;
    if (layer["source-layer"] !== "transportation") continue;
    map.addLayer(
      {
        id: GLOW + layer.id,
        type: "line",
        source: layer.source,
        "source-layer": "transportation",
        ...(layer.filter ? { filter: layer.filter } : {}),
        ...(layer.minzoom ? { minzoom: layer.minzoom } : {}),
        paint: {
          "line-width": expr([
            "interpolate",
            ["linear"],
            ["zoom"],
            7,
            5,
            12,
            12,
          ]),
          "line-blur": expr([
            "interpolate",
            ["linear"],
            ["zoom"],
            7,
            5,
            12,
            10,
          ]),
        },
      },
      firstName
    );
  }
  map.addSource(ROUTE, { type: "geojson", data: line([]) });
  map.addSource(FLOWN, { type: "geojson", data: line([]) });
  map.addSource(AIRPORT_DOTS, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: AIRPORTS.map((airport) => ({
        type: "Feature",
        properties: {
          name: `${airport.code}  ${airport.city}`,
          size: airport.size,
        },
        geometry: { type: "Point", coordinates: lngLat(airport) },
      })),
    } as Collection,
  });
  map.addLayer(
    {
      id: ROUTE,
      type: "line",
      source: ROUTE,
      paint: {
        "line-width": 1.6,
        "line-dasharray": [3, 2],
        "line-opacity": 0.7,
      },
    },
    firstName
  );
  map.addLayer(
    {
      id: FLOWN,
      type: "line",
      source: FLOWN,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-width": 3 },
    },
    firstName
  );
  map.addLayer({
    id: AIRPORT_DOTS,
    type: "circle",
    source: AIRPORT_DOTS,
    paint: {
      "circle-radius": 3.5,
      "circle-stroke-width": 1.5,
      // Far out, as when the whole route is shown, only big airports show.
      "circle-opacity": expr(FAR_FADE),
      "circle-stroke-opacity": expr(FAR_FADE),
    },
  });
  map.addLayer({
    id: AIRPORT_NAMES,
    type: "symbol",
    source: AIRPORT_DOTS,
    layout: {
      "text-field": ["get", "name"],
      "text-font": baseFont(map),
      "text-size": 12,
      "text-anchor": "left",
      "text-offset": [0.8, 0],
      "text-letter-spacing": 0.03,
      "text-optional": true,
      "symbol-sort-key": expr(["-", 3, ["get", "size"]]),
    },
    paint: { "text-halo-width": 1.6, "text-opacity": expr(FAR_FADE) },
  });
}

const PLANE =
  "M0,-9 L2.2,-3 L9,2 L9,4 L2.2,2 L1.6,7 L4,9 L4,10 L0,9 L-4,10 L-4,9 " +
  "L-1.6,7 L-2.2,2 L-9,4 L-9,2 L-2.2,-3 Z";

/** The plane and the shadow it casts on the ground below. */
function planeElement(): HTMLDivElement {
  const plane = document.createElement("div");
  plane.style.cssText = "width:46px;height:46px;pointer-events:none";
  plane.innerHTML =
    '<svg viewBox="-12 -12 24 24" width="46" height="46" ' +
    'style="overflow:visible;display:block">' +
    `<path data-part="shadow" d="${PLANE}" fill="#000" opacity="0.35"/>` +
    `<path data-part="body" d="${PLANE}" fill="#fff" stroke="#05060c" ` +
    'stroke-width="0.8" stroke-linejoin="round"/></svg>';
  return plane;
}

export function FlightMap({
  plan,
  palette,
  night,
  secondsFlown,
  headingUp,
  padding,
}: FlightMapProps) {
  const host = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const path = useMemo(() => pathFor(plan), [plan]);
  // What the frame loop reads. Changing these never rebuilds the map.
  const live = useRef({ secondsFlown, headingUp, padding, path, plan });
  live.current = { secondsFlown, headingUp, padding, path, plan };
  const peekUntil = useRef(0);

  useEffect(() => {
    if (!host.current) return;
    const { path: first } = live.current;
    const start = first.pointAt(0);
    const made = new maplibregl.Map({
      container: host.current,
      style: STYLE,
      center: lngLat(start),
      zoom: zoomFor(start.latitude, host.current.clientHeight),
      // The map follows the plane. It is not dragged by hand.
      interactive: false,
      attributionControl: { compact: true },
    });
    made.on("load", () => {
      addOurLayers(made);
      setMap(made);
    });
    return () => {
      setMap(null);
      made.remove();
    };
  }, []);

  // The palette shifts a little every minute. Repaint only when the
  // rounded colors change.
  const paint = css(palette.base) + css(palette.accent) + night;
  useEffect(() => {
    if (map) recolor(map, palette, night);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, paint]);

  useEffect(() => {
    if (!map) return;
    source(map, ROUTE)?.setData(line(pathLine(path).map(lngLat)));
  }, [map, path]);

  // A tap shows the whole route for a few seconds, then comes back.
  useEffect(() => {
    const element = host.current;
    if (!map || !element) return;
    const peek = () => {
      const bounds = new maplibregl.LngLatBounds();
      for (const place of pathLine(live.current.path)) {
        bounds.extend(lngLat(place));
      }
      peekUntil.current = performance.now() + PEEK_MS;
      // The map already keeps clear of the bar and the strip. This is the
      // extra room around the route.
      map.fitBounds(bounds, {
        padding: 50,
        bearing: 0,
        maxZoom: 9,
        duration: EASE_MS,
      });
    };
    element.addEventListener("click", peek);
    return () => element.removeEventListener("click", peek);
  }, [map]);

  // The frame loop: move the plane, and keep the map on it.
  useEffect(() => {
    if (!map) return;
    const element = planeElement();
    const body = element.querySelector<SVGPathElement>('[data-part="body"]');
    const shadow = element.querySelector<SVGPathElement>(
      '[data-part="shadow"]'
    );
    const marker = new maplibregl.Marker({
      element,
      rotationAlignment: "map",
      pitchAlignment: "map",
    });
    let added = false;
    let frame = 0;
    let lastDraw = 0;
    let lastKey = "";
    let lastTrail = -1;
    let bearing = map.getBearing();
    let returning = 0;
    let wasPeeking = false;

    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      // The ground moves under two pixels a second. Ten frames a second is
      // smooth, and leaves the processor alone.
      if (time - lastDraw < 90) return;
      lastDraw = time;
      const current = live.current;
      const seconds = current.secondsFlown();
      const miles = milesFlownAt(seconds, current.plan);
      const at = current.path.pointAt(miles);
      const heading = current.path.headingAt(miles);
      const climb = climbAt(seconds, current.plan.plannedSeconds);

      marker.setLngLat(lngLat(at)).setRotation(heading);
      if (!added) {
        marker.addTo(map);
        added = true;
      }
      // Higher up, the plane looks bigger and its shadow falls further off.
      const lift = 2.5 * climb;
      body?.setAttribute("transform", `scale(${0.72 + 0.28 * climb})`);
      shadow?.setAttribute(
        "transform",
        `translate(${lift} ${lift * 1.4}) scale(${0.72 + 0.1 * climb})`
      );

      if (Math.abs(miles - lastTrail) > 0.15) {
        lastTrail = miles;
        const trail = pathLine(current.path, 0, miles, 48).map(lngLat);
        source(map, FLOWN)?.setData(line(trail));
      }

      const peeking = time < peekUntil.current;
      if (peeking) {
        wasPeeking = true;
        return;
      }
      const want = current.headingUp ? heading : 0;
      const height = map.getContainer().clientHeight;
      const zoom = zoomFor(at.latitude, height) + (1 - climb) * RUNWAY_ZOOM;
      if (wasPeeking) {
        // Glide back to the plane, then follow it again.
        wasPeeking = false;
        returning = time + EASE_MS;
        bearing = want;
        map.easeTo({
          center: lngLat(at),
          zoom,
          bearing,
          padding: current.padding,
          duration: EASE_MS,
        });
        return;
      }
      if (time < returning) return;
      // Turn toward the wanted bearing by the short way round.
      const off = ((want - bearing + 540) % 360) - 180;
      bearing = Math.abs(off) < 0.2 ? want : bearing + off * 0.18;
      const key = [
        at.longitude.toFixed(6),
        at.latitude.toFixed(6),
        zoom.toFixed(3),
        bearing.toFixed(2),
        height,
        current.padding.bottom,
      ].join();
      if (key === lastKey) return;
      lastKey = key;
      map.jumpTo({
        center: lngLat(at),
        zoom,
        bearing,
        padding: current.padding,
      });
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      marker.remove();
    };
  }, [map]);

  return (
    <div
      ref={host}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        cursor: "pointer",
      }}
    />
  );
}
