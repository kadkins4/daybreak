import {
  addDays,
  conditionLabel,
  formatClock,
  formatDayShort,
  moonPhase,
  weatherAt,
  type Habit,
} from "@daybreak/core";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState, type ComponentRef } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Glow } from "@/components/Glow";
import { HabitRow, HabitSquare } from "@/components/HabitTiles";
import { Icon } from "@/components/Icon";
import { Splash } from "@/components/Splash";
import { SunDial } from "@/components/SunDial";
import { Wordmark } from "@/components/Wordmark";
import { ComingButtons, PlaceholderTile } from "@/components/TodayParts";
import { useDaybreakData } from "@/lib/daybreak-data";
import { useSky } from "@/lib/sky";
import { color, font, tile } from "@/lib/ui";
import { usePageTitle } from "@/lib/title";

const TASKS_MESSAGE = "Your top three Tasks will show here.";
const EVENTS_MESSAGE = "Your next events will show here.";

/** A round glass button with one icon. */
function RoundButton({
  icon,
  label,
  onPress,
  disabled,
  size = 46,
}: {
  icon: "left" | "right" | "list";
  label: string;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={(44 - Math.min(44, size)) / 2}
      style={({ pressed }) => [
        tile(size / 2),
        {
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.3 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Icon name={icon} size={size >= 44 ? 20 : 16} color={color.text} />
    </Pressable>
  );
}

/** The weather, shown inside the Sun Dial. */
function DialWeather({ scale }: { scale: number }) {
  const { weather, weatherIsFallback, locate, minutes, night, now } = useSky();
  const moon = useMemo(() => moonPhase(now), [now]);
  const size = (value: number) => Math.round(value * scale);

  const muted = {
    fontFamily: font.regular,
    color: color.muted,
    textAlign: "center",
  } as const;

  if (!weather) {
    return (
      <Text style={[muted, { fontSize: size(15) }]}>Weather is loading</Text>
    );
  }

  const current = weatherAt(weather, minutes);
  return (
    <>
      <Text
        style={{
          fontFamily: font.semibold,
          fontSize: size(60),
          lineHeight: size(60),
          color: color.text,
        }}
      >
        {current.temperature}°
      </Text>
      <Text
        style={{
          fontFamily: font.regular,
          fontSize: size(15),
          color: color.text,
          marginTop: size(6),
          textAlign: "center",
        }}
      >
        {conditionLabel(current.code, night)} in {weather.place}
      </Text>
      <Text style={[muted, { fontSize: size(13), marginTop: size(4) }]}>
        {night
          ? `${moon.name} · ${Math.round(moon.illumination * 100)}% full`
          : `High ${weather.high}° · Low ${weather.low}°`}
      </Text>
      <Text style={[muted, { fontSize: size(12), marginTop: size(4) }]}>
        Sunrise {formatClock(weather.sunrise)} · Sunset{" "}
        {formatClock(weather.sunset)}
      </Text>
      {weatherIsFallback ? (
        <Pressable
          onPress={locate}
          accessibilityRole="button"
          hitSlop={12}
          style={{ marginTop: size(8) }}
        >
          <Text
            style={{
              fontFamily: font.medium,
              fontSize: size(12),
              color: color.text,
              textDecorationLine: "underline",
            }}
          >
            Use my location
          </Text>
        </Pressable>
      ) : null}
    </>
  );
}

function Dial({ size }: { size: number }) {
  const { minutes, sun, night, palette, now } = useSky();
  const moon = useMemo(() => moonPhase(now), [now]);
  return (
    <SunDial
      size={size}
      minutes={minutes}
      sun={sun}
      night={night}
      palette={palette}
      moon={moon}
      label={
        `24 hour dial showing the ${night ? "moon" : "sun"} at ` +
        `${formatClock(minutes, true)}, with sunrise and sunset`
      }
    >
      <DialWeather scale={size / 320} />
    </SunDial>
  );
}

export default function Today() {
  usePageTitle("Daybreak");
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const sky = useSky();
  const data = useDaybreakData();

  // Zero is today. One is yesterday, and so on back.
  const [daysBack, setDaysBack] = useState(0);
  const day = addDays(sky.today, -daysBack);
  const wide = width >= 900;

  const logo = useRef<ComponentRef<typeof View>>(null);
  const splash = (
    <Splash
      target={logo}
      size={wide ? 36 : 32}
      ready={data.status !== "loading"}
      accent={sky.accent()}
      glow={sky.glow()}
      base={sky.base}
    />
  );

  // Yesterday is named. Any other day shows its date.
  const dayName =
    daysBack === 0 ? "Today · " : daysBack === 1 ? "Yesterday · " : "";
  const dayLabel = dayName + formatDayShort(day);

  const dayStepper = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <RoundButton
        icon="left"
        label="Previous day"
        size={32}
        onPress={() => setDaysBack(daysBack + 1)}
      />
      <RoundButton
        icon="right"
        label="Next day"
        size={32}
        disabled={daysBack === 0}
        onPress={() => setDaysBack(Math.max(0, daysBack - 1))}
      />
    </View>
  );

  // Shown only while taps cannot be sent. It floats over the page, so
  // nothing moves when it comes and goes.
  const waiting =
    data.waiting > 0 ? (
      <View
        pointerEvents="none"
        accessibilityLiveRegion="polite"
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 0,
          right: 0,
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <View style={[tile(16), { paddingVertical: 6, paddingHorizontal: 14 }]}>
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 13,
              color: color.muted,
            }}
          >
            Offline. {data.waiting} {data.waiting === 1 ? "change" : "changes"}{" "}
            will send when you reconnect.
          </Text>
        </View>
      </View>
    ) : null;

  const manage = (
    <RoundButton
      icon="list"
      label="Manage Habits"
      onPress={() => router.push("/habits")}
    />
  );

  const tileProps = (habit: Habit) => ({
    habit,
    count: data.countFor(habit.id, day),
    streak: data.streakFor(habit, sky.today),
    onChange: (count: number) => data.setCount(habit.id, day, count),
  });

  const notice =
    data.status === "error" ? (
      <Text
        style={{ fontFamily: font.regular, fontSize: 15, color: color.muted }}
      >
        Your Habits could not be loaded. Check the connection and reload.
      </Text>
    ) : data.status === "ready" && data.habits.length === 0 ? (
      <Text
        style={{ fontFamily: font.regular, fontSize: 15, color: color.muted }}
      >
        No Habits yet. Add one from Manage Habits.
      </Text>
    ) : null;

  if (wide) {
    const habitRows = (
      <>
        {notice}
        {data.habits.map((habit) => (
          <HabitRow key={habit.id} {...tileProps(habit)} />
        ))}
      </>
    );
    const scale = Math.min(
      1.4,
      Math.max(0.8, Math.min(width / 1280, height / 720))
    );
    return (
      <View style={{ flex: 1 }}>
        <Glow />
        {waiting}
        <View style={{ flex: 1, padding: 32, gap: 20 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
            >
              <Pressable
                ref={logo}
                onPress={() => setDaysBack(0)}
                accessibilityRole="button"
                accessibilityLabel="Go to today"
              >
                <Wordmark size={36} accent={sky.accent()} base={sky.base} />
              </Pressable>
              <View style={{ marginTop: 8 }}>{dayStepper}</View>
              <Text
                style={{
                  fontFamily: font.regular,
                  fontSize: 16,
                  color: color.muted,
                  marginTop: 10,
                }}
              >
                {dayLabel}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
            >
              <Text
                style={{
                  fontFamily: font.regular,
                  fontSize: 20,
                  color: color.text,
                }}
              >
                {formatClock(sky.minutes, true)}
              </Text>
              {manage}
            </View>
          </View>

          <View
            style={{ flex: 1, flexDirection: "row", gap: 20, minHeight: 0 }}
          >
            <View style={{ width: 300, gap: 16 }}>
              <PlaceholderTile title="Top three" message={TASKS_MESSAGE} />
              <PlaceholderTile title="Up next" message={EVENTS_MESSAGE} />
            </View>

            <View
              style={{
                flex: 1,
                minWidth: 0,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Dial size={Math.round(413 * scale)} />
            </View>

            <View style={{ width: 320, gap: 12 }}>
              {/* Up to five rows share the height. More than that scroll. */}
              {data.habits.length > 5 ? (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ flexGrow: 1, gap: 12 }}
                  showsVerticalScrollIndicator={false}
                >
                  {habitRows}
                </ScrollView>
              ) : (
                <View style={{ flex: 1, gap: 12 }}>{habitRows}</View>
              )}
              <ComingButtons />
            </View>
          </View>
        </View>
        {splash}
      </View>
    );
  }

  const column = Math.min(width, 480);
  const square = Math.floor((column - 40 - 30) / 4);

  return (
    <View style={{ flex: 1 }}>
      <Glow />
      {waiting}
      <ScrollView
        contentContainerStyle={{
          width: column,
          alignSelf: "center",
          paddingHorizontal: 20,
          paddingTop: 20 + insets.top,
          paddingBottom: 20 + insets.bottom,
          gap: 14,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View>
            <Pressable
              ref={logo}
              onPress={() => setDaysBack(0)}
              accessibilityRole="button"
              accessibilityLabel="Go to today"
              style={{ alignSelf: "flex-start" }}
            >
              <Wordmark size={32} accent={sky.accent()} base={sky.base} />
            </Pressable>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginTop: 4,
              }}
            >
              {dayStepper}
              <Text
                style={{
                  fontFamily: font.regular,
                  fontSize: 14,
                  color: color.muted,
                }}
              >
                {dayLabel}
              </Text>
            </View>
          </View>
          {manage}
        </View>

        <View style={{ alignSelf: "center" }}>
          <Dial size={Math.min(320, column - 40)} />
        </View>

        <ComingButtons />

        {notice}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {data.habits.map((habit) => (
            <HabitSquare key={habit.id} width={square} {...tileProps(habit)} />
          ))}
        </View>

        <PlaceholderTile
          title="Top three"
          message={TASKS_MESSAGE}
          minHeight={150}
        />
        <PlaceholderTile
          title="Up next"
          message={EVENTS_MESSAGE}
          minHeight={150}
        />
      </ScrollView>
      {splash}
    </View>
  );
}
