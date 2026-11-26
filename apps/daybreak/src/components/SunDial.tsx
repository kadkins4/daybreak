import {
  css,
  dialAngle,
  elapsedArc,
  type MoonPhase,
  type Palette,
  type SunTimes,
} from "@daybreak/core";
import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

const CENTRE = 250;
const RING = 200;
const DAYLIGHT = "rgba(255,180,107,0.32)";
const NIGHT = "rgba(190,200,255,0.2)";

/** A point on a circle around the dial's centre, for a time of day. */
function point(minutes: number, radius = RING) {
  const angle = (dialAngle(minutes) * Math.PI) / 180;
  return {
    x: CENTRE + radius * Math.sin(angle),
    y: CENTRE - radius * Math.cos(angle),
  };
}

/** A clockwise arc along the ring from one time of day to another. */
function arc(from: number, to: number): string {
  const start = point(from);
  const end = point(to);
  const sweep = (dialAngle(to) - dialAngle(from) + 360) % 360;
  const large = sweep > 180 ? 1 : 0;
  return (
    `M${start.x.toFixed(1)} ${start.y.toFixed(1)} ` +
    `A${RING} ${RING} 0 ${large} 1 ${end.x.toFixed(1)} ${end.y.toFixed(1)}`
  );
}

const fix = (value: number) => value.toFixed(1);

function Sun({ x, y, palette }: { x: number; y: number; palette: Palette }) {
  // The sun is the accent lightened halfway to white.
  const [r, g, b] = palette.accent;
  const disc = css([(r + 255) / 2, (g + 255) / 2, (b + 255) / 2]);
  const rays = Array.from({ length: 8 }, (_, index) => {
    const angle = (index * Math.PI) / 4;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return (
      `M${fix(x + 17 * cos)} ${fix(y + 17 * sin)}` +
      `L${fix(x + 24 * cos)} ${fix(y + 24 * sin)}`
    );
  }).join("");
  return (
    <G>
      <Circle cx={x} cy={y} r={34} fill={css(palette.accent, 0.2)} />
      <Path d={rays} stroke={disc} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={x} cy={y} r={11} fill={disc} />
    </G>
  );
}

/** The dark patches on the moon's face, as offsets from its centre. */
const SEAS: [number, number, number][] = [
  [-5, -5, 5.5],
  [3.5, -7, 3.2],
  [6, 2.5, 3.6],
  [-2.5, 5.5, 3],
  [-8.5, 3, 2.2],
  [1, -0.5, 2],
];

function Moon({ x, y, moon }: { x: number; y: number; moon: MoonPhase }) {
  const radius = 15;
  // The edge of the lit part is half an ellipse that narrows toward the
  // quarters and widens again toward new and full.
  const edge = radius * Math.abs(1 - 2 * moon.illumination);
  const gibbous = moon.illumination > 0.5;
  const top = `${fix(x)} ${fix(y - radius)}`;
  const bottom = `${fix(x)} ${fix(y + radius)}`;
  // Lit on the right while waxing and on the left while waning.
  const outer = moon.waxing ? 1 : 0;
  const inner = gibbous === moon.waxing ? 1 : 0;
  const lit =
    `M${top} A${radius} ${radius} 0 0 ${outer} ${bottom} ` +
    `A${fix(edge)} ${radius} 0 0 ${inner} ${top} Z`;
  return (
    <G>
      <Defs>
        <ClipPath id="moon-lit">
          <Path d={lit} />
        </ClipPath>
        <RadialGradient id="moon-face" cx="38%" cy="34%" r="75%">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="0.6" stopColor="#e9edf8" />
          <Stop offset="1" stopColor="#bcc3da" />
        </RadialGradient>
      </Defs>
      <Circle cx={x} cy={y} r={32} fill="rgba(190,200,255,0.16)" />
      <Circle
        cx={x}
        cy={y}
        r={radius}
        fill="#1b1d2c"
        stroke="rgba(230,235,255,0.45)"
      />
      {/* The surface stays put. Only the lit part of it shows. */}
      <G clipPath="url(#moon-lit)">
        <Circle cx={x} cy={y} r={radius} fill="url(#moon-face)" />
        {SEAS.map(([dx, dy, size]) => (
          <Circle
            key={`${dx},${dy}`}
            cx={x + dx}
            cy={y + dy}
            r={size}
            fill="rgba(96,106,140,0.38)"
          />
        ))}
      </G>
    </G>
  );
}

/**
 * The Sun Dial: a 24-hour ring with noon at the top and midnight at the
 * bottom. Whatever is passed as children sits inside the ring.
 */
export function SunDial({
  size,
  minutes,
  sun,
  night,
  palette,
  moon,
  label,
  children,
}: {
  size: number;
  minutes: number;
  sun: SunTimes;
  night: boolean;
  palette: Palette;
  moon: MoonPhase;
  label: string;
  children?: ReactNode;
}) {
  const elapsed = elapsedArc(minutes, sun);
  const here = point(minutes);

  const longTicks = [0, 360, 720, 1080]
    .map((time) => {
      const inner = point(time, 166);
      const outer = point(time, 184);
      return `M${fix(inner.x)} ${fix(inner.y)}L${fix(outer.x)} ${fix(outer.y)}`;
    })
    .join("");

  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        viewBox="12 12 476 476"
        fill="none"
        role="img"
        aria-label={label}
      >
        <Circle
          cx={CENTRE}
          cy={CENTRE}
          r={178}
          stroke="rgba(255,255,255,0.26)"
          strokeWidth={7}
          strokeDasharray="2 44.6"
        />
        <Path
          d={longTicks}
          stroke="rgba(255,255,255,0.6)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <Path
          d={arc(sun.sunset, sun.sunrise)}
          stroke={NIGHT}
          strokeWidth={10}
          strokeLinecap="round"
        />
        <Path
          d={arc(sun.sunrise, sun.sunset)}
          stroke={DAYLIGHT}
          strokeWidth={10}
          strokeLinecap="round"
        />
        <Path
          d={arc(elapsed.from, elapsed.to)}
          stroke={css(palette.accent)}
          strokeWidth={10}
          strokeLinecap="round"
        />
        {night ? (
          <Moon x={here.x} y={here.y} moon={moon} />
        ) : (
          <Sun x={here.x} y={here.y} palette={palette} />
        )}
      </Svg>
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </View>
    </View>
  );
}
