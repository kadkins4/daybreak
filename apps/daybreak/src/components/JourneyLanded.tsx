import { airportFor, formatFlightTime } from "@daybreak/core";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Glow } from "@/components/Glow";
import { useJourneys, type Journey } from "@/lib/journey";
import { useSky } from "@/lib/sky";
import { color, font, label, tile } from "@/lib/ui";

const whole = (value: number) => Math.round(value).toLocaleString("en-US");

function Figure({ value, name }: { value: string; name: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
      <Text
        style={{ fontFamily: font.semibold, fontSize: 26, color: color.text }}
      >
        {value}
      </Text>
      <Text style={[label, { fontSize: 11, textAlign: "center" }]}>{name}</Text>
    </View>
  );
}

/** The summary of a Journey that has ended. */
export function JourneyLanded({
  journey,
  onAgain,
  onToday,
}: {
  journey: Journey;
  onAgain: () => void;
  onToday: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { accent, base } = useSky();
  const { totals } = useJourneys();
  const here = airportFor(journey.landedAt ?? journey.origin);
  const city = here?.city ?? journey.landedAt ?? "";
  const roundTrip = journey.destination === null;
  const minutes = Math.floor(journey.flownSeconds / 60);
  const title =
    journey.status === "diverted"
      ? roundTrip || journey.landedAt === journey.origin
        ? `Back in ${city}`
        : `Diverted to ${city}`
      : roundTrip
        ? `Back in ${city}`
        : `Landed in ${city}`;

  const button = (name: string, onPress: () => void, filled?: boolean) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flex: 1,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: filled ? accent() : color.chip,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          fontFamily: font.semibold,
          fontSize: 16,
          color: filled ? color.accentInk : color.text,
        }}
      >
        {name}
      </Text>
    </Pressable>
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: base,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 16,
        paddingHorizontal: 16,
      }}
    >
      <Glow />
      <View
        style={[
          tile(28),
          { width: "100%", maxWidth: 440, padding: 24, gap: 20 },
        ]}
      >
        <View style={{ gap: 6, alignItems: "center" }}>
          <Text style={label}>
            {journey.origin}
            {roundTrip ? " · Round Trip" : ` to ${journey.destination}`}
          </Text>
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: font.semibold,
              fontSize: 28,
              color: color.text,
              textAlign: "center",
            }}
          >
            {title}
          </Text>
          {journey.focus ? (
            <Text
              style={{
                fontFamily: font.regular,
                fontSize: 15,
                color: color.muted,
                textAlign: "center",
              }}
            >
              {journey.focus}
            </Text>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Figure value={formatFlightTime(minutes)} name="Focused" />
          <Figure value={whole(journey.milesEarned ?? 0)} name="Miles" />
        </View>

        <View
          style={{
            borderTopWidth: 1,
            borderColor: color.border,
            paddingTop: 16,
            flexDirection: "row",
            gap: 8,
          }}
        >
          <Figure value={whole(totals.miles)} name="Miles in all" />
          <Figure value={String(totals.airports)} name="Airports visited" />
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {button("Today", onToday)}
          {button("Fly again", onAgain, true)}
        </View>
      </View>
    </View>
  );
}
