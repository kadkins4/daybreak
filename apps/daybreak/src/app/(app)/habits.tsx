import type { Habit, HabitType } from "@daybreak/core";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Glow } from "@/components/Glow";
import { Icon, habitIcon, type IconName } from "@/components/Icon";
import { useDaybreakData, type HabitInput } from "@/lib/daybreak-data";
import { useSession } from "@/lib/session";
import { useSky } from "@/lib/sky";
import { color, font, label, tile } from "@/lib/ui";
import { usePageTitle } from "@/lib/title";

const text = { fontFamily: font.regular, fontSize: 16, color: color.text };
const mutedText = {
  fontFamily: font.regular,
  fontSize: 14,
  color: color.muted,
};

const input = {
  height: 48,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: color.border,
  backgroundColor: "rgba(255,255,255,0.06)",
  paddingHorizontal: 14,
  fontFamily: font.regular,
  fontSize: 16,
  color: color.text,
} as const;

function IconButton({
  icon,
  label: spoken,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: color.chip,
        opacity: disabled ? 0.3 : pressed ? 0.6 : 1,
      })}
    >
      <Icon name={icon} size={20} color={color.text} />
    </Pressable>
  );
}

function TextButton({
  title,
  onPress,
  filled,
  disabled,
}: {
  title: string;
  onPress: () => void;
  filled?: boolean;
  disabled?: boolean;
}) {
  const { accent } = useSky();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 18,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: filled ? accent() : color.chip,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          fontFamily: font.semibold,
          fontSize: 15,
          color: filled ? color.accentInk : color.text,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function Field({
  name,
  hint,
  children,
}: {
  name: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{ fontFamily: font.medium, fontSize: 14, color: color.muted }}
      >
        {name}
        {hint ? (
          <Text style={{ fontFamily: font.regular }}> · {hint}</Text>
        ) : null}
      </Text>
      {children}
    </View>
  );
}

/** The form for adding a Habit, or changing one that exists. */
function HabitForm({
  habit,
  onSave,
  onCancel,
}: {
  habit?: Habit;
  onSave: (input: HabitInput) => Promise<string | null>;
  onCancel: () => void;
}) {
  const { accent } = useSky();
  const [name, setName] = useState(habit?.name ?? "");
  const [shortName, setShortName] = useState(habit?.shortName ?? "");
  const [type, setType] = useState<HabitType>(habit?.type ?? "complete");
  const [dailyNumber, setDailyNumber] = useState(
    String(habit?.type === "increment" ? habit.dailyNumber : 4)
  );
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const number = Math.floor(Number(dailyNumber));
  const valid =
    name.trim().length > 0 &&
    (type === "complete" || (number >= 1 && number <= 99));

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const failed = await onSave({
      name,
      shortName: shortName.trim() || null,
      type,
      dailyNumber: type === "complete" ? 1 : number,
    });
    setBusy(false);
    if (failed) setProblem(failed);
  };

  return (
    <View style={{ gap: 14 }}>
      <Field name="Name">
        <TextInput
          aria-label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Morning walk, 5+ minutes"
          placeholderTextColor="rgba(189,179,168,0.5)"
          style={input}
        />
      </Field>
      <Field name="Short name" hint="optional, for the phone squares">
        <TextInput
          aria-label="Short name"
          value={shortName}
          onChangeText={setShortName}
          placeholder="Walk"
          placeholderTextColor="rgba(189,179,168,0.5)"
          maxLength={12}
          style={input}
        />
      </Field>
      {habit ? null : (
        <Field name="Type">
          <View
            accessibilityRole="radiogroup"
            style={{ flexDirection: "row", gap: 8 }}
          >
            {(["complete", "increment"] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => setType(option)}
                accessibilityRole="radio"
                accessibilityState={{ checked: type === option }}
                style={{
                  flex: 1,
                  minHeight: 48,
                  borderRadius: 14,
                  borderWidth: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: type === option ? accent(0.55) : color.border,
                  backgroundColor:
                    type === option ? accent(0.2) : "rgba(255,255,255,0.06)",
                }}
              >
                <Text
                  style={{
                    fontFamily: font.medium,
                    fontSize: 15,
                    color: color.text,
                  }}
                >
                  {option === "complete" ? "Complete once" : "Count up"}
                </Text>
              </Pressable>
            ))}
          </View>
        </Field>
      )}
      {type === "increment" ? (
        <Field name="Daily number" hint="taps to finish the day">
          <TextInput
            aria-label="Daily number"
            value={dailyNumber}
            onChangeText={(value) => setDailyNumber(value.replace(/\D/g, ""))}
            inputMode="numeric"
            maxLength={2}
            style={[input, { width: 96 }]}
          />
        </Field>
      ) : null}
      {problem ? (
        <Text
          accessibilityRole="alert"
          style={{ ...mutedText, color: "#ffb3a1" }}
        >
          {problem}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <TextButton
          title={busy ? "Saving" : habit ? "Save" : "Add Habit"}
          onPress={save}
          filled
          disabled={!valid || busy}
        />
        <TextButton title="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}

function describe(habit: Habit): string {
  return habit.type === "complete"
    ? "Complete once a day"
    : `Count up to ${habit.dailyNumber} a day`;
}

export default function ManageHabits() {
  usePageTitle("Habits · Daybreak");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const data = useDaybreakData();
  const { signOut } = useSession();

  // The id of the Habit being edited, "new" while adding, or null.
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <Glow />
      <ScrollView
        contentContainerStyle={{
          width: "100%",
          maxWidth: 640,
          alignSelf: "center",
          paddingHorizontal: 20,
          paddingTop: 20 + insets.top,
          paddingBottom: 40 + insets.bottom,
          gap: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <IconButton
            icon="left"
            label="Back to Today"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
          />
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: font.semibold,
              fontSize: 28,
              color: color.text,
            }}
          >
            Habits
          </Text>
        </View>

        {data.habits.map((habit, index) => (
          <View key={habit.id} style={[tile(26), { padding: 16, gap: 14 }]}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: color.chip,
                }}
              >
                <Icon
                  name={habitIcon(habit.name)}
                  size={20}
                  color={color.text}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...text, fontFamily: font.semibold }}>
                  {habit.name}
                </Text>
                <Text style={mutedText}>
                  {describe(habit)}
                  {habit.shortName ? ` · "${habit.shortName}"` : ""}
                </Text>
              </View>
              <IconButton
                icon="up"
                label={`Move ${habit.name} up`}
                disabled={index === 0}
                onPress={() => void data.moveHabit(habit.id, -1)}
              />
              <IconButton
                icon="down"
                label={`Move ${habit.name} down`}
                disabled={index === data.habits.length - 1}
                onPress={() => void data.moveHabit(habit.id, 1)}
              />
            </View>
            {editing === habit.id ? (
              <HabitForm
                habit={habit}
                onCancel={() => setEditing(null)}
                onSave={async (input) => {
                  const failed = await data.updateHabit(habit.id, {
                    name: input.name,
                    shortName: input.shortName,
                    ...(habit.type === "increment"
                      ? { dailyNumber: input.dailyNumber }
                      : {}),
                  });
                  if (!failed) setEditing(null);
                  return failed;
                }}
              />
            ) : (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextButton title="Edit" onPress={() => setEditing(habit.id)} />
                <TextButton
                  title="Archive"
                  onPress={() => void data.setArchived(habit.id, true)}
                />
              </View>
            )}
          </View>
        ))}

        <View style={[tile(26), { padding: 16, gap: 14 }]}>
          {editing === "new" ? (
            <>
              <Text style={label}>New Habit</Text>
              <HabitForm
                onCancel={() => setEditing(null)}
                onSave={async (input) => {
                  const failed = await data.addHabit(input);
                  if (!failed) setEditing(null);
                  return failed;
                }}
              />
            </>
          ) : (
            <Pressable
              onPress={() => setEditing("new")}
              accessibilityRole="button"
              style={{
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <Icon name="plus" size={20} color={color.text} />
              <Text style={{ ...text, fontFamily: font.semibold }}>
                Add a Habit
              </Text>
            </Pressable>
          )}
        </View>

        {data.archivedHabits.length > 0 ? (
          <View style={[tile(26), { padding: 16, gap: 12 }]}>
            <Text style={label}>Archived</Text>
            {data.archivedHabits.map((habit) => (
              <View
                key={habit.id}
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={text}>{habit.name}</Text>
                  <Text style={mutedText}>History kept</Text>
                </View>
                <TextButton
                  title="Restore"
                  onPress={() => void data.setArchived(habit.id, false)}
                />
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ alignItems: "flex-start", marginTop: 8 }}>
          <TextButton title="Sign out" onPress={() => void signOut()} />
        </View>
      </ScrollView>
    </View>
  );
}
