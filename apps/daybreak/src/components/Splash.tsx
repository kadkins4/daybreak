import {
  useEffect,
  useLayoutEffect,
  useState,
  type ComponentRef,
  type RefObject,
} from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";

import { WordmarkArt } from "@/components/Wordmark";
import { color, web } from "@/lib/ui";

/** How long the sunrise runs before the logo may leave for the header. */
const INTRO_MS = 4300;
/** How long the logo takes to land and the screen to appear. */
const LAND_MS = 1300;

const RISE = "cubic-bezier(.2,.6,.2,1)";
const SLIDE = "cubic-bezier(.5,0,.2,1)";

/**
 * The sun's light on the water: how far below the horizon in logo units,
 * width as a share of the sun's, and strength.
 */
const SHIMMER: [number, number, number][] = [
  [6, 1.25, 0.7],
  [13, 0.9, 0.5],
  [21, 0.6, 0.36],
  [30, 0.34, 0.24],
];

/**
 * Still ripples on the water, wider apart the nearer they are: how far below
 * the horizon in logo units, width as a share of the horizon's, and strength.
 */
const RIPPLES: [number, number, number][] = [
  [17, 0.8, 0.16],
  [38, 0.62, 0.12],
  [64, 0.46, 0.09],
  [96, 0.32, 0.065],
  [134, 0.2, 0.045],
];

// The splash plays once each time the app is opened, not on every visit to
// Today. Someone who asked for less motion never sees it.
let played =
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * A style that holds a CSS animation. The web only runs keyframes from a
 * style sheet, not from a style written straight onto a view.
 */
const keyframed = (style: Record<string, unknown>) =>
  StyleSheet.create({ style: web(style) }).style;

const fade = (ms: number, delay = 0) =>
  web({
    transitionProperty: "opacity",
    transitionDuration: `${ms}ms`,
    transitionDelay: `${delay}ms`,
  });

/**
 * The opening screen. A horizon draws over still water, the sun rises over
 * it, the name appears in front of the line, the sun slides in behind the D,
 * and the finished logo goes up to its place in the header as Today appears.
 * It waits on the horizon until Today has loaded.
 */
export function Splash({
  target,
  size,
  ready,
  accent,
  glow,
  base,
}: {
  /** The header logo this one lands on. */
  target: RefObject<ComponentRef<typeof View> | null>;
  /** The size the header logo is drawn at. */
  size: number;
  /** True once Today has what it needs to show. */
  ready: boolean;
  accent: string;
  glow: string;
  base: string;
}) {
  const { width, height } = useWindowDimensions();
  const [home, setHome] = useState<{ x: number; y: number } | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const [phase, setPhase] = useState<"intro" | "land" | "done">(
    played ? "done" : "intro"
  );

  useLayoutEffect(() => {
    if (phase !== "intro" || home) return;
    target.current?.measureInWindow((x, y) => setHome({ x, y }));
  }, [phase, home, target]);

  // If the header logo cannot be found, show Today rather than a blank screen.
  useEffect(() => {
    if (home || phase !== "intro") return;
    const timer = setTimeout(() => {
      played = true;
      setPhase("done");
    }, 600);
    return () => clearTimeout(timer);
  }, [home, phase]);

  useEffect(() => {
    if (!home) return;
    const timer = setTimeout(() => setIntroDone(true), INTRO_MS);
    return () => clearTimeout(timer);
  }, [home]);

  useEffect(() => {
    if (phase !== "intro" || !introDone || !ready) return;
    played = true;
    setPhase("land");
  }, [phase, introDone, ready]);

  useEffect(() => {
    if (phase !== "land") return;
    const timer = setTimeout(() => setPhase("done"), LAND_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "done") return null;
  const landing = phase === "land";

  // One unit is one unit of the logo's own 190 by 52 drawing.
  const u = size / 36;
  const markWidth = 190 * u;
  const scale = Math.min(width * 0.72, 430) / markWidth;
  const horizon = Math.round(height * 0.39);
  const startX = (width - markWidth * scale) / 2;
  const startY = horizon - 42 * u * scale;
  const lineWidth = markWidth * scale * 1.2;
  const glowWidth = Math.min(width * 1.6, 900);
  // Where the sun stands once it has risen, and how wide it is there.
  const sunX = startX + 87 * u * scale;
  const sunWidth = 32 * u * scale;

  return (
    <View
      pointerEvents={landing ? "none" : "auto"}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={[
        { top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000 },
        web({ position: Platform.OS === "web" ? "fixed" : "absolute" }),
      ]}
    >
      <View
        style={[
          {
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: base,
            opacity: landing ? 0 : 1,
          },
          fade(700, 300),
        ]}
      />
      {home ? (
        <>
          {/* The sky above the horizon, warming as the sun comes up. */}
          <View
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: horizon - 1,
                overflow: "hidden",
                opacity: landing ? 0 : 1,
              },
              fade(400),
            ]}
          >
            <View
              style={[
                {
                  position: "absolute",
                  left: (width - glowWidth) / 2,
                  bottom: -glowWidth * 0.375,
                  width: glowWidth,
                  height: glowWidth * 0.75,
                },
                keyframed({
                  backgroundImage: `radial-gradient(closest-side, ${glow}, transparent)`,
                  animationKeyframes: [
                    { "0%": { opacity: 0 }, "100%": { opacity: 0.5 } },
                  ],
                  animationDuration: "2400ms",
                  animationDelay: "400ms",
                  animationTimingFunction: "ease-out",
                  animationFillMode: "both",
                }),
              ]}
            />
          </View>
          {/* The water below the horizon, lit by the sky above it. */}
          <View
            style={[
              {
                position: "absolute",
                top: horizon,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: "hidden",
                opacity: landing ? 0 : 1,
              },
              fade(400),
            ]}
          >
            <View
              style={[
                {
                  position: "absolute",
                  left: (width - glowWidth) / 2,
                  top: -glowWidth * 0.22,
                  width: glowWidth,
                  height: glowWidth * 0.44,
                },
                keyframed({
                  backgroundImage: `radial-gradient(closest-side, ${glow}, transparent)`,
                  animationKeyframes: [
                    { "0%": { opacity: 0 }, "100%": { opacity: 0.42 } },
                  ],
                  animationDuration: "2400ms",
                  animationDelay: "400ms",
                  animationTimingFunction: "ease-out",
                  animationFillMode: "both",
                }),
              ]}
            />
            {RIPPLES.map(([drop, part, strength], index) => (
              <View
                key={drop}
                style={[
                  {
                    position: "absolute",
                    top: drop * u * scale,
                    left: (width - lineWidth * part) / 2,
                    width: lineWidth * part,
                    height: 1,
                    backgroundColor: color.text,
                  },
                  keyframed({
                    animationKeyframes: [
                      { "0%": { opacity: 0 }, "100%": { opacity: strength } },
                    ],
                    animationDuration: "1400ms",
                    animationDelay: `${700 + index * 220}ms`,
                    animationTimingFunction: "ease-out",
                    animationFillMode: "both",
                  }),
                ]}
              />
            ))}
            {/* The sun's light on the water, while it stands over it. */}
            {SHIMMER.map(([drop, part, strength], index) => (
              <View
                key={drop}
                style={[
                  {
                    position: "absolute",
                    top: drop * u * scale,
                    left: sunX - (sunWidth * part) / 2,
                    width: sunWidth * part,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: accent,
                  },
                  keyframed({
                    animationKeyframes: [
                      {
                        "0%": { opacity: 0 },
                        "30%": { opacity: strength },
                        "75%": { opacity: strength },
                        "100%": { opacity: 0 },
                      },
                    ],
                    animationDuration: "2000ms",
                    animationDelay: `${1000 + index * 90}ms`,
                    animationTimingFunction: "ease-in-out",
                    animationFillMode: "both",
                  }),
                ]}
              />
            ))}
          </View>
          <View
            style={[
              {
                position: "absolute",
                top: horizon - 1,
                left: (width - lineWidth) / 2,
                width: lineWidth,
                height: 1,
                backgroundColor: color.text,
                opacity: landing ? 0 : 0.5,
              },
              fade(400),
              keyframed({
                animationKeyframes: [
                  {
                    "0%": { transform: "scaleX(0)" },
                    "100%": { transform: "scaleX(1)" },
                  },
                ],
                animationDuration: "900ms",
                animationTimingFunction: "ease-out",
                animationFillMode: "both",
              }),
            ]}
          />

          {/* The logo. It sits where the header logo is, and starts out
              moved to the horizon and enlarged. */}
          <View
            style={[
              {
                position: "absolute",
                left: home.x,
                top: home.y,
                width: markWidth,
                height: 52 * u,
              },
              web({
                transformOrigin: "0 0",
                transform: landing
                  ? "translate(0px, 0px) scale(1)"
                  : `translate(${startX - home.x}px, ${startY - home.y}px) ` +
                    `scale(${scale})`,
                transitionProperty: "transform",
                transitionDuration: "900ms",
                transitionDelay: "300ms",
                transitionTimingFunction: SLIDE,
              }),
            ]}
          >
            {/* The sun, cut off at the horizon while it rises. */}
            <View
              style={{
                position: "absolute",
                left: -20 * u,
                top: -20 * u,
                width: markWidth + 40 * u,
                height: (landing ? 72 : 62) * u,
                overflow: "hidden",
              }}
            >
              <View
                style={[
                  {
                    position: "absolute",
                    left: 36 * u,
                    top: 24 * u,
                    width: 20 * u,
                    height: 20 * u,
                    borderRadius: 10 * u,
                    backgroundColor: accent,
                  },
                  keyframed({
                    animationKeyframes: [
                      {
                        "0%": {
                          transform: `translate(${61 * u}px, ${52 * u}px) scale(1.6)`,
                          animationTimingFunction: RISE,
                        },
                        "46%": {
                          transform: `translate(${61 * u}px, 0px) scale(1.6)`,
                        },
                        "69%": {
                          transform: `translate(${61 * u}px, 0px) scale(1.6)`,
                          animationTimingFunction: SLIDE,
                        },
                        "100%": { transform: "translate(0px, 0px) scale(1)" },
                      },
                    ],
                    animationDuration: "3900ms",
                    animationDelay: "300ms",
                    animationFillMode: "both",
                  }),
                ]}
              />
            </View>
            {/* The name, whole and in front of the horizon. */}
            <View
              style={[
                { position: "absolute", left: 0, top: 0 },
                keyframed({
                  animationKeyframes: [
                    {
                      "0%": {
                        opacity: 0,
                        transform: `translateY(${12 * u}px)`,
                      },
                      "100%": { opacity: 1, transform: "translateY(0px)" },
                    },
                  ],
                  animationDuration: "1200ms",
                  animationDelay: "1800ms",
                  animationTimingFunction: "cubic-bezier(.2,.7,.2,1)",
                  animationFillMode: "both",
                }),
              ]}
            >
              <WordmarkArt size={size} base={base} />
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}
