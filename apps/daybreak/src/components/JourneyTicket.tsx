import { formatFlightTime, type FlightPlan } from "@daybreak/core";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { RoundButton } from "@/components/RoundButton";
import { useSky } from "@/lib/sky";
import { color, font, label, tile, web } from "@/lib/ui";

function End({
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
        style={{
          fontFamily: font.semibold,
          fontSize: 40,
          letterSpacing: 1,
          color: color.text,
        }}
      >
        {code}
      </Text>
      <Text
        numberOfLines={1}
        style={{ fontFamily: font.regular, fontSize: 14, color: color.muted }}
      >
        {city}
      </Text>
    </View>
  );
}

function Fact({ name, value }: { name: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={[label, { fontSize: 11 }]}>{name}</Text>
      <Text
        style={{ fontFamily: font.semibold, fontSize: 16, color: color.text }}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * The ticket for a chosen flight. He can say what he is focusing on, then
 * punch it to take off.
 */
export function JourneyTicket({
  plan,
  onPunch,
  onClose,
}: {
  plan: FlightPlan;
  onPunch: (focus: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { accent, base } = useSky();
  const [focus, setFocus] = useState("");
  const to = plan.destination ?? plan.origin;
  const minutes = Math.round(plan.plannedSeconds / 60);
  // The half-circles bitten out of each side, where the stub tears off.
  const notch = (side: "left" | "right") => (
    <View
      style={{
        position: "absolute",
        [side]: -11,
        top: -10,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: base,
        borderWidth: 1,
        borderColor: color.border,
      }}
    />
  );
  return (
    <View
      style={[
        {
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 16,
          backgroundColor: "rgba(0,0,0,0.5)",
        },
      ]}
    >
      <View
        accessibilityRole="summary"
        style={[tile(28), { width: "100%", maxWidth: 420, overflow: "hidden" }]}
      >
        <View style={{ padding: 20, gap: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[label, { flex: 1 }]}>
              {plan.destination
                ? "Boarding pass"
                : "Boarding pass · Round Trip"}
            </Text>
            <RoundButton
              icon="close"
              label="Back to the map"
              size={32}
              onPress={onClose}
            />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <End
              code={plan.origin.code}
              city={plan.origin.city}
              align="flex-start"
            />
            <View style={web({ transform: "rotate(90deg)" })}>
              <Icon name="plane" size={24} color={accent()} />
            </View>
            <End code={to.code} city={to.city} align="flex-end" />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Fact name="Flight time" value={formatFlightTime(minutes)} />
            <Fact
              name="Miles"
              value={Math.round(plan.plannedMiles).toLocaleString("en-US")}
            />
            <Fact name="Lands in" value={to.city} />
          </View>
        </View>

        <View>
          <View
            style={{
              borderTopWidth: 1,
              borderColor: color.border,
              borderStyle: "dashed",
              marginHorizontal: 14,
            }}
          />
          {notch("left")}
          {notch("right")}
        </View>

        <View style={{ padding: 20, gap: 14 }}>
          <TextInput
            value={focus}
            onChangeText={setFocus}
            placeholder="What are you focusing on? (optional)"
            placeholderTextColor={color.muted}
            accessibilityLabel="What are you focusing on? Optional"
            maxLength={120}
            returnKeyType="go"
            onSubmitEditing={() => onPunch(focus)}
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
          <Pressable
            onPress={() => onPunch(focus)}
            accessibilityRole="button"
            accessibilityLabel="Punch ticket and take off"
            style={({ pressed }) => ({
              height: 52,
              borderRadius: 26,
              flexDirection: "row",
              gap: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: accent(),
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: font.semibold,
                fontSize: 17,
                color: color.accentInk,
              }}
            >
              Punch ticket
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
