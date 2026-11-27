import { AIRPORTS, type Airport, type Place } from "@daybreak/core";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { JourneyMap } from "@/components/JourneyMap";
import { RoundButton } from "@/components/RoundButton";
import { useCurrentAirport } from "@/lib/journey";
import { useSky } from "@/lib/sky";
import { usePageTitle } from "@/lib/title";
import { color, font, tile } from "@/lib/ui";

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
  const mustPick = status === "pick";

  return (
    <View style={{ flex: 1, backgroundColor: base }}>
      <JourneyMap centre={airport ?? MIDDLE} here={airport} palette={palette} />

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: insets.left + 12,
          right: insets.right + 12,
          gap: 12,
          alignItems: "center",
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
              onPress={() => setSearching(true)}
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
                onChoose(next);
              }}
            />
          </View>
        ) : null}
      </View>
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
