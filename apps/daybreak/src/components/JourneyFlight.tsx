import {
  LANDING_SECONDS,
  TAKEOFF_SECONDS,
  diversionAt,
  formatCountdown,
  milesFlownAt,
  pathFor,
  secondsFlownAt,
} from "@daybreak/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { FlightMap } from "@/components/FlightMap";
import { RoundButton } from "@/components/RoundButton";
import { flightNow } from "@/lib/clock";
import { planOf, useJourneys, type Journey } from "@/lib/journey";
import { useSky } from "@/lib/sky";
import { readJson, writeJson } from "@/lib/storage";
import { color, font, label, tile, web } from "@/lib/ui";

const HEADING_UP = "daybreak.journey.headingUp";

const miles = (value: number) => Math.round(value).toLocaleString("en-US");

/** The compass: its red end points north. A tap turns the map. */
function Compass({
  turn,
  headingUp,
  onPress,
}: {
  /** Degrees the needle is turned, so its red end points north. */
  turn: number;
  headingUp: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        headingUp
          ? "The plane points up. Switch to north up"
          : "North is up. Switch to the plane pointing up"
      }
      style={({ pressed }) => [
        tile(23),
        {
          width: 46,
          height: 46,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={web({
          transform: `rotate(${turn}deg)`,
          transition: "transform 400ms ease",
        })}
      >
        <Svg width={26} height={26} viewBox="-13 -13 26 26" aria-hidden>
          <Path d="M0,-10 L4,0 L-4,0Z" fill="#ff7b6b" />
          <Path d="M0,10 L4,0 L-4,0Z" fill="#cfd3e6" />
        </Svg>
      </View>
    </Pressable>
  );
}

function StripButton({
  name,
  filled,
  onPress,
}: {
  name: string;
  filled?: boolean;
  onPress: () => void;
}) {
  const { accent } = useSky();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flex: 1,
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: filled ? accent() : color.chip,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        numberOfLines={1}
        style={{
          fontFamily: font.semibold,
          fontSize: 15,
          color: filled ? color.accentInk : color.text,
        }}
      >
        {name}
      </Text>
    </Pressable>
  );
}

function Airport({
  code,
  city,
  align,
}: {
  code: string;
  city: string;
  align: "flex-start" | "flex-end";
}) {
  return (
    <View style={{ flex: 1, alignItems: align }}>
      <Text
        style={{ fontFamily: font.semibold, fontSize: 20, color: color.text }}
      >
        {code}
      </Text>
      <Text
        numberOfLines={1}
        style={{ fontFamily: font.regular, fontSize: 12, color: color.muted }}
      >
        {city}
      </Text>
    </View>
  );
}

/** A Journey in the air or paused: the close map and the strip under it. */
export function JourneyFlight({
  journey,
  onMinimize,
}: {
  journey: Journey;
  onMinimize: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { palette, night, accent, base } = useSky();
  const { pause, resume, endEarly, soundOn, toggleSound } = useJourneys();
  const plan = useMemo(
    () => planOf(journey),
    // The plan never changes while a Journey is in the air.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [journey.id]
  );
  const path = useMemo(() => (plan ? pathFor(plan) : null), [plan]);
  const [headingUp, setHeadingUp] = useState(false);
  const [ending, setEnding] = useState(false);
  const [stripHeight, setStripHeight] = useState(200);
  const [, redraw] = useState(0);

  // The map asks for the time flown on every frame, from the newest row.
  const row = useRef(journey);
  row.current = journey;
  const secondsFlown = useRef(() =>
    secondsFlownAt(row.current, flightNow())
  ).current;

  useEffect(() => {
    void readJson<boolean>(HEADING_UP).then((saved) => {
      if (saved) setHeadingUp(true);
    });
  }, []);
  // The strip counts in seconds.
  useEffect(() => {
    const timer = setInterval(() => redraw((count) => count + 1), 250);
    return () => clearInterval(timer);
  }, []);

  // Clear of the map's credit line along the bottom edge.
  const bottom = insets.bottom + 40;
  const padding = useMemo(
    () => ({
      top: insets.top + 70,
      bottom: bottom + stripHeight,
      left: 0,
      right: 0,
    }),
    [insets.top, bottom, stripHeight]
  );

  if (!plan || !path)
    return <View style={{ flex: 1, backgroundColor: base }} />;

  const paused = journey.status === "paused";
  const seconds = secondsFlownAt(journey, flightNow());
  const left = plan.plannedSeconds - seconds;
  const flown = milesFlownAt(seconds, plan);
  const heading = path.headingAt(flown);
  const to = plan.destination ?? plan.origin;
  const phase = paused
    ? "Paused"
    : seconds < TAKEOFF_SECONDS
      ? "Taking off"
      : left < LANDING_SECONDS
        ? "Landing"
        : plan.destination
          ? "Time left"
          : flown < (path.turn?.from ?? 0)
            ? "Round Trip · outbound"
            : "Round Trip · heading back";
  const landing = ending ? diversionAt(plan, flown) : null;

  return (
    <View style={{ flex: 1, backgroundColor: base }}>
      <FlightMap
        plan={plan}
        palette={palette}
        night={night}
        secondsFlown={secondsFlown}
        headingUp={headingUp}
        padding={padding}
      />
      {paused ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
          }}
        />
      ) : null}

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: insets.left + 12,
          right: insets.right + 12,
          flexDirection: "row",
          gap: 10,
        }}
      >
        <RoundButton
          icon="down"
          label="Minimize. The flight keeps going"
          onPress={onMinimize}
        />
        <View style={{ flex: 1 }} pointerEvents="none" />
        <RoundButton
          icon={soundOn ? "sound" : "mute"}
          label={soundOn ? "Sound is on. Mute" : "Sound is off. Turn on"}
          onPress={toggleSound}
        />
        <Compass
          turn={headingUp ? -heading : 0}
          headingUp={headingUp}
          onPress={() => {
            setHeadingUp(!headingUp);
            void writeJson(HEADING_UP, !headingUp);
          }}
        />
      </View>

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: insets.left + 12,
          right: insets.right + 12,
          bottom,
          alignItems: "center",
        }}
      >
        <View
          onLayout={(event) => setStripHeight(event.nativeEvent.layout.height)}
          style={[
            tile(26),
            { width: "100%", maxWidth: 520, padding: 16, gap: 12 },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Airport
              code={plan.origin.code}
              city={plan.origin.city}
              align="flex-start"
            />
            <View style={{ alignItems: "center" }}>
              <Text style={[label, { fontSize: 11 }]}>{phase}</Text>
              <Text
                accessibilityRole="timer"
                style={[
                  {
                    fontFamily: font.semibold,
                    fontSize: 34,
                    color: color.text,
                  },
                  web({ fontVariantNumeric: "tabular-nums" }),
                ]}
              >
                {formatCountdown(left)}
              </Text>
            </View>
            <Airport code={to.code} city={to.city} align="flex-end" />
          </View>

          <View
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: Math.round((flown / path.miles) * 100),
            }}
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: color.pip,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${(flown / path.miles) * 100}%`,
                height: 4,
                borderRadius: 2,
                backgroundColor: accent(),
              }}
            />
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text
              style={{
                fontFamily: font.regular,
                fontSize: 13,
                color: color.muted,
              }}
            >
              {miles(flown)} miles flown
            </Text>
            <Text
              style={{
                fontFamily: font.regular,
                fontSize: 13,
                color: color.muted,
              }}
            >
              {miles(path.miles - flown)} to go
            </Text>
          </View>

          {journey.focus && !landing ? (
            <Text
              numberOfLines={2}
              style={{
                fontFamily: font.medium,
                fontSize: 15,
                color: color.text,
                textAlign: "center",
              }}
            >
              {journey.focus}
            </Text>
          ) : null}

          {landing ? (
            <>
              <Text
                style={{
                  fontFamily: font.regular,
                  fontSize: 14,
                  lineHeight: 20,
                  color: color.text,
                  textAlign: "center",
                }}
              >
                {landing.miles > 0
                  ? `End now and you land in ${landing.airport.city} with ` +
                    `${miles(landing.miles)} Miles.`
                  : `End now and you are back in ${landing.airport.city} ` +
                    "with no Miles."}{" "}
                Your {Math.floor(seconds / 60)} focus minutes are kept.
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <StripButton
                  name={paused ? "Go back" : "Keep flying"}
                  filled
                  onPress={() => setEnding(false)}
                />
                <StripButton name="Land now" onPress={endEarly} />
              </View>
            </>
          ) : (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {paused ? (
                <StripButton name="Resume" filled onPress={resume} />
              ) : (
                <StripButton name="Pause" onPress={pause} />
              )}
              <StripButton name="End flight" onPress={() => setEnding(true)} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
