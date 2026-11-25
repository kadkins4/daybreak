import {
  countAfterLongPress,
  countAfterTap,
  habitShortName,
  habitTitleAndNote,
  isDone,
  progressLabel,
  type Habit,
} from "@hub/core";
import { Pressable, Text, View } from "react-native";

import { useSky } from "@/lib/sky";
import { color, finishedTile, font, noSelect, tile } from "@/lib/ui";

import { Icon, habitIcon } from "./Icon";

interface HabitTileProps {
  habit: Habit;
  count: number;
  streak: number;
  onChange: (count: number) => void;
}

/** One tap adds or completes. A long-press takes one back. */
function useHabitPress({ habit, count, onChange }: HabitTileProps) {
  const done = isDone(habit, count);
  const status = progressLabel(habit, count);
  return {
    done,
    onPress: () => onChange(countAfterTap(habit, count)),
    onLongPress: () => onChange(countAfterLongPress(count)),
    accessibilityLabel: `${habit.name}, ${done ? "done" : status}`,
    accessibilityHint:
      habit.type === "increment"
        ? "Tap to add one, long-press to take one away"
        : "Tap to mark done, tap again to undo",
  };
}

function Chip({
  habit,
  done,
  size,
}: {
  habit: Habit;
  done: boolean;
  size: number;
}) {
  const { accent } = useSky();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: done ? accent() : color.chip,
      }}
    >
      <Icon
        name={done ? "check" : habitIcon(habit.name)}
        size={size >= 48 ? 24 : 18}
        color={done ? color.accentInk : color.text}
        strokeWidth={done ? 2.2 : 1.8}
      />
    </View>
  );
}

/** A Habit as a wide row: icon, name, status, progress and streak. */
export function HabitRow(props: HabitTileProps) {
  const { habit, count, streak } = props;
  const { accent, glow } = useSky();
  const { done, ...press } = useHabitPress(props);
  const { title, note } = habitTitleAndNote(habit.name);

  const status =
    habit.type === "increment"
      ? done
        ? "Done"
        : progressLabel(habit, count)
      : done
        ? "Done"
        : (note ?? "Not yet");

  return (
    <Pressable
      {...press}
      accessibilityRole="button"
      delayLongPress={400}
      style={({ pressed }) => [
        done ? finishedTile(26, accent, glow) : tile(26),
        {
          flexGrow: 1,
          flexBasis: 0,
          minHeight: 76,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          opacity: pressed ? 0.85 : 1,
        },
        noSelect,
      ]}
    >
      <Chip habit={habit} done={done} size={52} />
      <View style={{ flexGrow: 1, flexShrink: 1 }}>
        <Text
          numberOfLines={1}
          style={{ fontFamily: font.semibold, fontSize: 19, color: color.text }}
        >
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: font.regular,
            fontSize: 14,
            marginTop: 3,
            color: done ? accent() : color.muted,
          }}
        >
          {status}
        </Text>
        {habit.type === "increment" ? (
          <View
            style={{
              flexDirection: "row",
              gap: 5,
              marginTop: 9,
              width: 132,
              maxWidth: "100%",
            }}
          >
            {Array.from({ length: habit.dailyNumber }, (_, index) => (
              <View
                key={index}
                style={{
                  flexGrow: 1,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: index < count ? accent() : color.pip,
                }}
              />
            ))}
          </View>
        ) : null}
      </View>
      <Text
        style={{
          fontFamily: font.regular,
          fontSize: 13,
          lineHeight: 17,
          color: color.muted,
          textAlign: "right",
        }}
      >
        {streak} {streak === 1 ? "day" : "days"}
        {"\n"}streak
      </Text>
    </Pressable>
  );
}

/** A Habit as a small square for the phone: icon, short name and progress. */
export function HabitSquare(props: HabitTileProps & { width: number }) {
  const { habit, count, width } = props;
  const { accent, glow } = useSky();
  const { done, ...press } = useHabitPress(props);

  return (
    <Pressable
      {...press}
      accessibilityRole="button"
      delayLongPress={400}
      style={({ pressed }) => [
        done ? finishedTile(20, accent, glow) : tile(20),
        {
          width,
          paddingVertical: 10,
          paddingHorizontal: 4,
          alignItems: "center",
          gap: 6,
          opacity: pressed ? 0.85 : 1,
        },
        noSelect,
      ]}
    >
      <Chip habit={habit} done={done} size={36} />
      <Text
        numberOfLines={1}
        style={{
          fontFamily: font.semibold,
          fontSize: 13,
          color: color.text,
          maxWidth: "100%",
        }}
      >
        {habitShortName(habit)}
      </Text>
      <Text
        style={{
          fontFamily: font.regular,
          fontSize: 12,
          color: done ? accent() : color.muted,
        }}
      >
        {done ? "Done" : `${count} of ${habit.dailyNumber}`}
      </Text>
    </Pressable>
  );
}
