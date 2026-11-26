import {
  countAfterLongPress,
  countAfterTap,
  habitShortName,
  habitTitleAndNote,
  isDone,
  progressLabel,
  type Habit,
} from "@hub/core";
import { useRef } from "react";
import {
  Pressable,
  Text as BaseText,
  View,
  type TextProps,
} from "react-native";

import { useSky } from "@/lib/sky";
import { color, finishedTile, font, noSelect, tile } from "@/lib/ui";

import { Icon, habitIcon } from "./Icon";

/** Text that a long-press cannot select. */
function Text({ style, ...props }: TextProps) {
  return <BaseText selectable={false} {...props} style={[style, noSelect]} />;
}

interface HabitTileProps {
  habit: Habit;
  count: number;
  streak: number;
  onChange: (count: number) => void;
}

/**
 * One tap adds or completes. A long-press takes one back.
 *
 * On a touch screen the browser follows a long-press with a made-up click
 * when the finger lifts. Without the guard below that click would count as
 * a tap and put the count straight back.
 */
function useHabitPress({ habit, count, onChange }: HabitTileProps) {
  const holding = useRef(false);
  const releasedAt = useRef(0);
  const done = isDone(habit, count);
  const status = progressLabel(habit, count);
  return {
    done,
    onPress: () => {
      if (Date.now() - releasedAt.current < 700) return;
      onChange(countAfterTap(habit, count));
    },
    onLongPress: () => {
      holding.current = true;
      onChange(countAfterLongPress(count));
    },
    onPressOut: () => {
      // Time the guard from when the finger lifts, however long it held.
      if (holding.current) releasedAt.current = Date.now();
      holding.current = false;
    },
    accessibilityLabel:
      habit.type === "increment"
        ? `${habit.name}, ${status}${done ? ", done" : ""}`
        : `${habit.name}, ${done ? "done" : "not done"}`,
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

/**
 * The line under a Habit's name. Counting Habits always show the count, even
 * past the daily number, so taking one back is never a guess. One-tap Habits
 * show their note until they are done.
 */
function statusLine(
  habit: Habit,
  count: number,
  done: boolean,
  note: string | null
): string {
  if (habit.type === "increment") return progressLabel(habit, count);
  return done ? "Done" : (note ?? "To do");
}

/** A square is narrow, so it only shows a note short enough to fit. */
function squareNote(name: string): string | null {
  const { note } = habitTitleAndNote(name);
  return note && note.length <= 11 ? note : null;
}

/** A Habit as a wide row: icon, name, status, progress and streak. */
export function HabitRow(props: HabitTileProps) {
  const { habit, count, streak } = props;
  const { accent, glow } = useSky();
  const { done, ...press } = useHabitPress(props);
  const { title, note } = habitTitleAndNote(habit.name);

  const status = statusLine(habit, count, done, note);

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
        numberOfLines={1}
        style={{
          fontFamily: font.regular,
          fontSize: 12,
          color: done ? accent() : color.muted,
        }}
      >
        {statusLine(habit, count, done, squareNote(habit.name))}
      </Text>
    </Pressable>
  );
}
