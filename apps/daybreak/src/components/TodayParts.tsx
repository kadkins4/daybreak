import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

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

/** Morning Drive, which is not built yet, and Journey. */
export function ComingButtons() {
  const router = useRouter();
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
        accessibilityLabel="Journey"
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
            backgroundColor: color.chip,
          }}
        >
          <Icon name="journey" size={18} color={color.text} />
        </View>
        <Text
          style={{ fontFamily: font.semibold, fontSize: 16, color: color.text }}
        >
          Journey
        </Text>
      </Pressable>
    </View>
  );
}
