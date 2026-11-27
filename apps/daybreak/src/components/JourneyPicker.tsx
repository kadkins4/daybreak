import {
  AIRPORTS,
  SHORTEST_ROUND_TRIP_MINUTES,
  flightsFrom,
  formatFlightTime,
  lengthWindow,
  milesBetween,
  milesForMinutes,
  nearestAirport,
  pathFor,
  pathLine,
  roundTripHeading,
  roundTripMiles,
  type Airport,
  type Flight,
  type FlightPlan,
  type Place,
} from "@daybreak/core";
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
import { JourneyTicket } from "@/components/JourneyTicket";
import { RoundButton } from "@/components/RoundButton";
import { useCurrentAirport, useJourneys } from "@/lib/journey";
import { useSky } from "@/lib/sky";
import { readJson, writeJson } from "@/lib/storage";
import { color, font, tile, web } from "@/lib/ui";
import { currentPosition } from "@/lib/weather";

/** How far he must be from his last takeoff before Daybreak asks. */
const MOVED_MILES = 100;
const STAYED = "daybreak.journey.stayed";

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

/** The button that turns a chosen flight into a ticket. */
function TicketButton({ onPress }: { onPress: () => void }) {
  const { accent } = useSky();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        height: 46,
        marginTop: 12,
        borderRadius: 23,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: accent(),
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text
        style={{
          fontFamily: font.semibold,
          fontSize: 16,
          color: color.accentInk,
        }}
      >
        Get ticket
      </Text>
    </Pressable>
  );
}

function Chip({
  name,
  detail,
  spoken,
  onPress,
}: {
  name: string;
  detail: string;
  spoken: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spoken}
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
        style={{ fontFamily: font.medium, fontSize: 14, color: color.text }}
      >
        {name}
      </Text>
      <Text
        style={{ fontFamily: font.regular, fontSize: 14, color: color.muted }}
      >
        {detail}
      </Text>
    </Pressable>
  );
}

/**
 * The chosen flight, or the choices a length gives: a Round Trip of exactly
 * that length, and the airports about that far away.
 */
function FlightCard({
  origin,
  flight,
  trip,
  near,
  length,
  onPick,
  onRoundTrip,
  onTicket,
}: {
  origin: Airport;
  flight: Flight | null;
  /** The chosen Round Trip, if that is the choice. */
  trip: FlightPlan | null;
  near: Flight[];
  length: number | null;
  onPick: (code: string) => void;
  onRoundTrip: () => void;
  onTicket: () => void;
}) {
  const title = { fontFamily: font.semibold, fontSize: 18, color: color.text };
  const detail = { fontFamily: font.regular, fontSize: 14, color: color.muted };
  const miles = (value: number) =>
    `${Math.round(value).toLocaleString("en-US")} miles`;
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
            {miles(flight.miles)}
          </Text>
        </Text>
        <TicketButton onPress={onTicket} />
      </View>
    );
  }
  if (trip) {
    return (
      <View style={[tile(24), { padding: 16, gap: 2 }]}>
        <Text numberOfLines={1} style={title}>
          Round Trip
        </Text>
        <Text numberOfLines={1} style={detail}>
          Out, one U-turn, and back to {origin.city}
        </Text>
        <Text style={[title, { fontSize: 16, marginTop: 8 }]}>
          {formatFlightTime(Math.round(trip.plannedSeconds / 60))}
          <Text style={{ fontFamily: font.regular, color: color.muted }}>
            {"  ·  "}
            {miles(trip.plannedMiles)}
          </Text>
        </Text>
        <TicketButton onPress={onTicket} />
      </View>
    );
  }
  if (length === null) return null;
  return (
    <View style={[tile(24), { padding: 16, gap: 10 }]}>
      <Text style={[title, { fontSize: 16 }]}>
        {formatFlightTime(length)} from {origin.city}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Chip
          name="Round Trip"
          detail={formatFlightTime(length)}
          spoken={`Round Trip, exactly ${formatFlightTime(length)}`}
          onPress={onRoundTrip}
        />
        {near.slice(0, 5).map((option) => (
          <Chip
            key={option.to.code}
            name={option.to.city}
            detail={formatFlightTime(option.minutes)}
            spoken={`${option.to.city}, ${formatFlightTime(option.minutes)}`}
            onPress={() => onPick(option.to.code)}
          />
        ))}
      </View>
      {near.length === 0 ? (
        <Text style={detail}>No airport is that far away.</Text>
      ) : null}
    </View>
  );
}

/** Asks whether to carry on from the Current Airport or move to a nearer one. */
function MovedCard({
  from,
  near,
  onStay,
  onMove,
}: {
  from: Airport;
  near: Airport;
  onStay: () => void;
  onMove: () => void;
}) {
  const button = (name: string, onPress: () => void) => (
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
        backgroundColor: color.chip,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text
        numberOfLines={1}
        style={{ fontFamily: font.medium, fontSize: 14, color: color.text }}
      >
        {name}
      </Text>
    </Pressable>
  );
  return (
    <View style={[tile(24), { padding: 16, gap: 12 }]}>
      <Text
        style={{ fontFamily: font.semibold, fontSize: 17, color: color.text }}
      >
        Have you moved?
      </Text>
      <Text
        style={{
          fontFamily: font.regular,
          fontSize: 14,
          lineHeight: 20,
          color: color.muted,
        }}
      >
        Your last Journey left you in {from.city}, and you look closer to{" "}
        {near.city} now.
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {button(`Stay in ${from.city}`, onStay)}
        {button(`Move to ${near.city}`, onMove)}
      </View>
    </View>
  );
}

/** The map, the Current Airport and the way to change it. */
export function JourneyPicker({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { palette, base } = useSky();
  const { status, airport, choose: onChoose } = useCurrentAirport();
  const { takeOff, recentHeadings, latest } = useJourneys();
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  // The heading of the chosen Round Trip, or null when that is not chosen.
  const [tripHeading, setTripHeading] = useState<number | null>(null);
  const [ticket, setTicket] = useState<FlightPlan | null>(null);
  // Where he really is, once the screen has found out.
  const position = useRef<Place | null>(null);
  const [movedTo, setMovedTo] = useState<Airport | null>(null);
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

  const trip = useMemo<FlightPlan | null>(
    () =>
      airport && length !== null && tripHeading !== null
        ? {
            origin: airport,
            destination: null,
            outboundHeading: tripHeading,
            plannedSeconds: length * 60,
            plannedMiles: roundTripMiles(length),
          }
        : null,
    [airport, length, tripHeading]
  );
  const tripLine = useMemo(
    () => (trip ? pathLine(pathFor(trip)) : null),
    [trip]
  );
  const plan: FlightPlan | null =
    flight && airport
      ? {
          origin: airport,
          destination: flight.to,
          outboundHeading: null,
          plannedSeconds: flight.minutes * 60,
          plannedMiles: flight.miles,
        }
      : trip;

  // Find out where he really is: it is saved with the takeoff, and it is
  // how Daybreak notices he has travelled since his last Journey.
  const airportCode = airport?.code;
  const lastId = latest?.id;
  const lastTakeoff = latest?.takeoff;
  useEffect(() => {
    if (!airportCode) return;
    let cancelled = false;
    (async () => {
      const found = await currentPosition();
      if (cancelled || !found) return;
      position.current = found;
      if (!lastId || !lastTakeoff) return;
      if (milesBetween(found, lastTakeoff) <= MOVED_MILES) return;
      const near = nearestAirport(found);
      if (near.code === airportCode) return;
      // He has already answered for this Journey on this screen.
      if ((await readJson<string>(STAYED)) === lastId) return;
      if (!cancelled) setMovedTo(near);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airportCode, lastId]);

  const answerMoved = (move: boolean) => {
    if (lastId) void writeJson(STAYED, lastId);
    if (move && movedTo) {
      setSelected(null);
      setLength(null);
      setTripHeading(null);
      onChoose(movedTo);
    }
    setMovedTo(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: base }}>
      <JourneyMap
        centre={airport ?? MIDDLE}
        here={airport}
        palette={palette}
        flights={flights}
        selected={selected}
        onSelect={(code) => {
          setSelected(code);
          if (code) {
            setTripHeading(null);
            setTiming(false);
          }
        }}
        ring={ring}
        trip={tripLine}
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
                setTripHeading(null);
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
                setTripHeading(null);
                onChoose(next);
              }}
            />
          </View>
        ) : null}
        {movedTo && airport && !searching && !ticket ? (
          <View style={{ width: "100%", maxWidth: 420 }}>
            <MovedCard
              from={airport}
              near={movedTo}
              onStay={() => answerMoved(false)}
              onMove={() => answerMoved(true)}
            />
          </View>
        ) : null}
        {timing && length !== null && !searching ? (
          <View style={{ width: "100%", maxWidth: 420 }}>
            <LengthPicker
              minutes={length}
              onChange={(next) => {
                setTripHeading(null);
                setLength(Math.max(SHORTEST_ROUND_TRIP_MINUTES, next));
              }}
              onClear={() => {
                setLength(null);
                setTripHeading(null);
                setTiming(false);
              }}
              onClose={() => setTiming(false)}
            />
          </View>
        ) : null}
      </View>

      {airport && !searching && !mustPick && !ticket ? (
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
              origin={airport}
              flight={flight}
              trip={trip}
              near={near}
              length={length}
              onPick={(code) => {
                setTiming(false);
                setTripHeading(null);
                setSelected(code);
              }}
              onRoundTrip={() => {
                if (length === null) return;
                setTiming(false);
                setSelected(null);
                setTripHeading(
                  roundTripHeading(
                    airport,
                    roundTripMiles(length),
                    recentHeadings,
                    Math.random()
                  )
                );
              }}
              onTicket={() => setTicket(plan)}
            />
          </View>
        </View>
      ) : null}

      {ticket ? (
        <JourneyTicket
          plan={ticket}
          onClose={() => setTicket(null)}
          onPunch={(focus) =>
            takeOff({ plan: ticket, focus, position: position.current })
          }
        />
      ) : null}
    </View>
  );
}
