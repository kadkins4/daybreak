import { airportFor, formatFlightTime, secondsFlownAt } from "@daybreak/core";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { flightNow } from "@/lib/clock";
import { useJourneys } from "@/lib/journey";
import { useSky } from "@/lib/sky";
import { color, font, label, tile } from "@/lib/ui";

import { Icon, type IconName } from "./Icon";

/** A tile that holds its place until its milestone arrives. */
export function PlaceholderTile({
  title,
  message,
  minHeight,
}: {
  title: string;
  message: string;
  minHeight?: number;
}) {
  return (
    <View
      style={[tile(28), { padding: 22, flexGrow: 1, flexBasis: 0, minHeight }]}
    >
      <Text style={label}>{title}</Text>
      <View style={{ flexGrow: 1, justifyContent: "center" }}>
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 15,
            lineHeight: 21,
            color: color.muted,
          }}
        >
          {message}
        </Text>
      </View>
    </View>
  );
}

/** A button for something that is not built yet. */
export function ComingButton({
  name,
  spokenName,
  icon,
  filled,
}: {
  name: string;
  spokenName: string;
  icon: IconName;
  filled?: boolean;
}) {
  const { accent } = useSky();
  return (
    <View
      accessibilityRole="button"
      accessibilityLabel={`${spokenName}, not available yet`}
      accessibilityState={{ disabled: true }}
      aria-disabled
      style={[
        tile(24),
        {
          height: 64,
          flexGrow: 1,
          flexBasis: 0,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          opacity: 0.55,
        },
      ]}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: filled ? accent() : color.chip,
        }}
      >
        <Icon
          name={icon}
          size={18}
          color={filled ? color.accentInk : color.text}
        />
      </View>
      <Text
        style={{ fontFamily: font.semibold, fontSize: 16, color: color.text }}
      >
        {name}
      </Text>
    </View>
  );
}

/** What the Journey button says while a Journey is on, or just over. */
function useJourneyNote(): { title: string; detail: string } | null {
  const { active, summary } = useJourneys();
  const [, redraw] = useState(0);
  const flying = active?.status === "flying";
  useEffect(() => {
    if (!flying) return;
    const timer = setInterval(() => redraw((count) => count + 1), 5000);
    return () => clearInterval(timer);
  }, [flying]);
  if (active) {
    const left = active.plannedSeconds - secondsFlownAt(active, flightNow());
    return {
      title: flying ? "In flight" : "Paused",
      detail:
        left < 60
          ? "Under a minute left"
          : `${formatFlightTime(Math.ceil(left / 60))} left`,
    };
  }
  if (summary) {
    const city = airportFor(summary.landedAt ?? "")?.city;
    return { title: "Landed", detail: city ? `In ${city}` : "See the summary" };
  }
  return null;
}

/** Morning Drive, which is not built yet, and Journey. */
export function ComingButtons() {
  const router = useRouter();
  const { accent } = useSky();
  const note = useJourneyNote();
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <ComingButton
        name="Drive"
        spokenName="Morning Drive"
        icon="play"
        filled
      />
      <Pressable
        onPress={() => router.push("/journey")}
        accessibilityRole="button"
        accessibilityLabel={
          note ? `Journey. ${note.title}, ${note.detail}` : "Journey"
        }
        style={({ pressed }) => [
          tile(24),
          {
            height: 64,
            flexGrow: 1,
            flexBasis: 0,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: note ? accent() : color.chip,
          }}
        >
          <Icon
            name="journey"
            size={18}
            color={note ? color.accentInk : color.text}
          />
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text
            style={{
              fontFamily: font.semibold,
              fontSize: 16,
              color: color.text,
            }}
          >
            {note?.title ?? "Journey"}
          </Text>
          {note ? (
            <Text
              numberOfLines={1}
              style={{
                fontFamily: font.regular,
                fontSize: 12,
                color: color.muted,
              }}
            >
              {note.detail}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}
