import {
  AIRPORTS,
  flightsFrom,
  formatFlightTime,
  lengthWindow,
  milesForMinutes,
  type Airport,
  type Flight,
  type Place,
} from "@daybreak/core";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { JourneyMap } from "@/components/JourneyMap";
import { RoundButton } from "@/components/RoundButton";
import { useCurrentAirport } from "@/lib/journey";
import { useSky } from "@/lib/sky";
import { usePageTitle } from "@/lib/title";
import { color, font, tile, web } from "@/lib/ui";

// The middle of the lower 48, shown until the Current Airport is known.
const MIDDLE: Place = { latitude: 39.5, longitude: -98.35 };

const cityAndState = (airport: Airport) => `${airport.city}, ${airport.state}`;

/** Airports whose code, city or name matches what was typed. */
function matches(typed: string): Airport[] {
  const wanted = typed.trim().toLowerCase();
  if (!wanted) return [];
  const starts: Airport[] = [];
  const contains: Airport[] = [];
  for (const airport of AIRPORTS) {
    const code = airport.code.toLowerCase();
    const city = airport.city.toLowerCase();
    if (code === wanted || city.startsWith(wanted)) starts.push(airport);
    else if (
      city.includes(wanted) ||
      airport.name.toLowerCase().includes(wanted)
    ) {
      contains.push(airport);
    }
  }
  const bySize = (a: Airport, b: Airport) => b.size - a.size;
  return [...starts.sort(bySize), ...contains.sort(bySize)].slice(0, 5);
}

/** Choosing the Current Airport by typing a city or a code. */
function AirportSearch({
  title,
  onChoose,
  onClose,
}: {
  title: string;
  onChoose: (airport: Airport) => void;
  onClose?: () => void;
}) {
  const [typed, setTyped] = useState("");
  const found = useMemo(() => matches(typed), [typed]);
  return (
    <View style={[tile(24), { padding: 16, gap: 12 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text
          style={{
            flex: 1,
            fontFamily: font.semibold,
            fontSize: 17,
            color: color.text,
          }}
        >
          {title}
        </Text>
        {onClose ? (
          <RoundButton icon="close" label="Close" size={32} onPress={onClose} />
        ) : null}
      </View>
      <TextInput
        value={typed}
        onChangeText={setTyped}
        placeholder="City or airport code"
        placeholderTextColor={color.muted}
        autoFocus
        autoCorrect={false}
        accessibilityLabel="City or airport code"
        style={{
          height: 48,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: color.border,
          backgroundColor: "rgba(255,255,255,0.06)",
          paddingHorizontal: 14,
          fontFamily: font.regular,
          fontSize: 16,
          color: color.text,
        }}
      />
      {found.length > 0 ? (
        <ScrollView
          style={{ maxHeight: 320 }}
          keyboardShouldPersistTaps="handled"
        >
          {found.map((airport) => (
            <Pressable
              key={airport.code}
              onPress={() => onChoose(airport)}
              accessibilityRole="button"
              accessibilityLabel={`${airport.name}, ${cityAndState(airport)}`}
              style={({ pressed }) => ({
                paddingVertical: 10,
                paddingHorizontal: 4,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  width: 44,
                  fontFamily: font.semibold,
                  fontSize: 15,
                  color: color.text,
                }}
              >
                {airport.code}
              </Text>
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: font.medium,
                    fontSize: 15,
                    color: color.text,
                  }}
                >
                  {cityAndState(airport)}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: font.regular,
                    fontSize: 13,
                    color: color.muted,
                  }}
                >
                  {airport.name}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : typed.trim() ? (
        <Text
          style={{ fontFamily: font.regular, fontSize: 14, color: color.muted }}
        >
          No airport matches that.
        </Text>
      ) : null}
    </View>
  );
}

const ROW = 40;
const HOURS = Array.from({ length: 7 }, (_, hour) => hour);
const MINUTES = Array.from({ length: 12 }, (_, step) => step * 5);

/** One scrolling column of numbers. The one in the middle is the choice. */
function Wheel({
  values,
  value,
  unit,
  onChange,
}: {
  values: number[];
  value: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const start = useRef(Math.max(0, values.indexOf(value)));
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Wait a frame so the column has its height before it is moved.
    const frame = requestAnimationFrame(() =>
      scroller.current?.scrollTo({ y: start.current * ROW, animated: false })
    );
    return () => {
      cancelAnimationFrame(frame);
      if (settle.current) clearTimeout(settle.current);
    };
  }, []);
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
      <ScrollView
        ref={scroller}
        accessibilityLabel={unit}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(event) => {
          // Read the choice once the column comes to rest. Nothing is
          // redrawn while it moves, so the scroll is never interrupted.
          const y = event.nativeEvent.contentOffset.y;
          if (settle.current) clearTimeout(settle.current);
          settle.current = setTimeout(() => {
            const at = Math.round(y / ROW);
            const next = values[Math.min(values.length - 1, Math.max(0, at))];
            if (next !== value) onChange(next);
          }, 140);
        }}
        style={[
          { height: ROW * 3, flexGrow: 0, width: 64 },
          web({
            scrollSnapType: "y mandatory",
            // The middle row is the choice. The rows above and below fade.
            maskImage:
              "linear-gradient(transparent 4%, #000 38%, #000 62%, transparent 96%)",
            WebkitMaskImage:
              "linear-gradient(transparent 4%, #000 38%, #000 62%, transparent 96%)",
          }),
        ]}
        contentContainerStyle={{ paddingVertical: ROW }}
      >
        {values.map((option, index) => (
          <Pressable
            key={option}
            onPress={() =>
              scroller.current?.scrollTo({ y: index * ROW, animated: true })
            }
            accessibilityRole="button"
            accessibilityLabel={`${option} ${unit}`}
            style={[
              { height: ROW, alignItems: "flex-end", justifyContent: "center" },
              web({ scrollSnapAlign: "center" }),
            ]}
          >
            <Text
              style={{
                fontFamily: font.semibold,
                fontSize: 22,
                color: color.text,
                paddingRight: 10,
              }}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text
        style={{ fontFamily: font.regular, fontSize: 15, color: color.muted }}
      >
        {unit}
      </Text>
    </View>
  );
}

/** Choosing how long to fly, in hours and minutes. */
function LengthPicker({
  minutes,
  onChange,
  onClear,
  onClose,
}: {
  minutes: number;
  onChange: (minutes: number) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return (
    <View style={[tile(24), { padding: 16, gap: 8 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text
          style={{
            flex: 1,
            fontFamily: font.semibold,
            fontSize: 17,
            color: color.text,
          }}
        >
          How long?
        </Text>
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          style={({ pressed }) => ({
            height: 32,
            paddingHorizontal: 12,
            borderRadius: 16,
            justifyContent: "center",
            backgroundColor: color.chip,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{ fontFamily: font.medium, fontSize: 14, color: color.text }}
          >
            Any length
          </Text>
        </Pressable>
        <RoundButton icon="check" label="Done" size={32} onPress={onClose} />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Wheel
          values={HOURS}
          value={hours}
          unit="h"
          onChange={(next) => onChange(next * 60 + rest)}
        />
        <Wheel
          values={MINUTES}
          value={rest}
          unit="min"
          onChange={(next) => onChange(hours * 60 + next)}
        />
      </View>
    </View>
  );
}

/** The chosen destination, or the airports a chosen length reaches. */
function FlightCard({
  flight,
  near,
  length,
  onPick,
}: {
  flight: Flight | null;
  near: Flight[];
  length: number | null;
  onPick: (code: string) => void;
}) {
  const title = { fontFamily: font.semibold, fontSize: 18, color: color.text };
  const detail = { fontFamily: font.regular, fontSize: 14, color: color.muted };
  if (flight) {
    return (
      <View style={[tile(24), { padding: 16, gap: 2 }]}>
        <Text numberOfLines={1} style={title}>
          {cityAndState(flight.to)}{" "}
          <Text style={{ fontFamily: font.medium, color: color.muted }}>
            {flight.to.code}
          </Text>
        </Text>
        <Text numberOfLines={1} style={detail}>
          {flight.to.name}
        </Text>
        <Text style={[title, { fontSize: 16, marginTop: 8 }]}>
          {formatFlightTime(flight.minutes)}
          <Text style={{ fontFamily: font.regular, color: color.muted }}>
            {"  ·  "}
            {Math.round(flight.miles).toLocaleString("en-US")} miles
          </Text>
        </Text>
      </View>
    );
  }
  if (length === null) return null;
  return (
    <View style={[tile(24), { padding: 16, gap: 10 }]}>
      <Text style={[title, { fontSize: 16 }]}>
        {near.length > 0
          ? `About ${formatFlightTime(length)} away`
          : `Nothing is ${formatFlightTime(length)} away`}
      </Text>
      {near.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {near.slice(0, 6).map((option) => (
            <Pressable
              key={option.to.code}
              onPress={() => onPick(option.to.code)}
              accessibilityRole="button"
              accessibilityLabel={`${option.to.city}, ${formatFlightTime(option.minutes)}`}
              style={({ pressed }) => ({
                height: 36,
                paddingHorizontal: 12,
                borderRadius: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: color.chip,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: font.medium,
                  fontSize: 14,
                  color: color.text,
                }}
              >
                {option.to.city}
              </Text>
              <Text style={detail}>{formatFlightTime(option.minutes)}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={detail}>Try a longer or shorter flight.</Text>
      )}
    </View>
  );
}

/** The map, the Current Airport and the way to change it. */
export function JourneyPicker({
  status,
  airport,
  onChoose,
  onBack,
}: {
  status: "loading" | "ready" | "pick";
  airport: Airport | null;
  onChoose: (airport: Airport) => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { palette, base } = useSky();
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  // The chosen flight length in minutes, or null for any length.
  const [length, setLength] = useState<number | null>(null);
  const [timing, setTiming] = useState(false);
  const mustPick = status === "pick";
  // On a wide screen the cards sit on the left and the map keeps the rest.
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const side = wide ? "flex-start" : "center";
  const padding = useMemo(
    () =>
      wide
        ? { top: 80, bottom: 60, left: 470, right: 60 }
        : { top: 96, bottom: 210, left: 48, right: 48 },
    [wide]
  );

  const flights = useMemo(
    () => (airport ? flightsFrom(airport) : []),
    [airport]
  );
  const flight = flights.find((option) => option.to.code === selected) ?? null;
  const ring = useMemo(
    () =>
      length === null
        ? null
        : { miles: milesForMinutes(length), ...lengthWindow(length) },
    [length]
  );
  const near = useMemo(
    () =>
      ring
        ? flights
            .filter((f) => f.minutes >= ring.low && f.minutes <= ring.high)
            // Biggest airports first, then the closest to the chosen length.
            .sort(
              (a, b) =>
                b.to.size - a.to.size ||
                Math.abs(a.minutes - (length ?? 0)) -
                  Math.abs(b.minutes - (length ?? 0))
            )
        : [],
    [flights, ring, length]
  );

  return (
    <View style={{ flex: 1, backgroundColor: base }}>
      <JourneyMap
        centre={airport ?? MIDDLE}
        here={airport}
        palette={palette}
        flights={flights}
        selected={selected}
        onSelect={setSelected}
        ring={ring}
        padding={padding}
      />

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: insets.left + 12,
          right: insets.right + 12,
          gap: 12,
          alignItems: side,
        }}
      >
        <View
          pointerEvents="box-none"
          style={{
            alignSelf: "stretch",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <RoundButton icon="left" label="Back to Today" onPress={onBack} />
          {airport && !searching ? (
            <Pressable
              onPress={() => {
                setTiming(false);
                setSearching(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={
                `You are in ${airport.city}, at ${airport.name}. ` +
                "Change airport"
              }
              style={({ pressed }) => [
                tile(23),
                {
                  height: 46,
                  flexShrink: 1,
                  paddingHorizontal: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={{
                  flexShrink: 1,
                  fontFamily: font.semibold,
                  fontSize: 15,
                  color: color.text,
                }}
              >
                {airport.city}
              </Text>
              <Text
                style={{
                  fontFamily: font.medium,
                  fontSize: 14,
                  color: color.muted,
                }}
              >
                {airport.code}
              </Text>
            </Pressable>
          ) : null}
          {airport && !searching && !timing ? (
            <Pressable
              onPress={() => {
                setSelected(null);
                setLength(length ?? 30);
                setTiming(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={
                length === null
                  ? "Choose a flight length"
                  : `Flight length ${formatFlightTime(length)}. Change`
              }
              style={({ pressed }) => [
                tile(23),
                {
                  height: 46,
                  marginLeft: "auto",
                  paddingHorizontal: 16,
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: font.medium,
                  fontSize: 15,
                  color: color.text,
                }}
              >
                {length === null ? "Any length" : formatFlightTime(length)}
              </Text>
            </Pressable>
          ) : null}
          {status === "loading" ? (
            <View
              style={[
                tile(23),
                { height: 46, paddingHorizontal: 16, justifyContent: "center" },
              ]}
            >
              <Text
                style={{
                  fontFamily: font.regular,
                  fontSize: 15,
                  color: color.muted,
                }}
              >
                Finding your airport
              </Text>
            </View>
          ) : null}
        </View>

        {searching || mustPick ? (
          <View style={{ width: "100%", maxWidth: 420 }}>
            <AirportSearch
              title={mustPick ? "Where are you?" : "Move to another airport"}
              onClose={mustPick ? undefined : () => setSearching(false)}
              onChoose={(next) => {
                setSearching(false);
                setSelected(null);
                setLength(null);
                onChoose(next);
              }}
            />
          </View>
        ) : null}
        {timing && length !== null && !searching ? (
          <View style={{ width: "100%", maxWidth: 420 }}>
            <LengthPicker
              minutes={length}
              onChange={(next) => setLength(Math.max(5, next))}
              onClear={() => {
                setLength(null);
                setTiming(false);
              }}
              onClose={() => setTiming(false)}
            />
          </View>
        ) : null}
      </View>

      {airport && !searching && !mustPick ? (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: insets.left + 12,
            right: insets.right + 12,
            bottom: insets.bottom + 40,
            alignItems: side,
          }}
        >
          <View style={{ width: "100%", maxWidth: 420 }}>
            <FlightCard
              flight={flight}
              near={near}
              length={length}
              onPick={(code) => {
                setTiming(false);
                setSelected(code);
              }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function Journey() {
  usePageTitle("Journey · Daybreak");
  const router = useRouter();
  const { status, airport, choose } = useCurrentAirport();
  return (
    <JourneyPicker
      status={status}
      airport={airport}
      onChoose={choose}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
    />
  );
}
