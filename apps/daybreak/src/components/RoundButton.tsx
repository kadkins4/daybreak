import { Pressable } from "react-native";

import { Icon, type IconName } from "@/components/Icon";
import { color, tile } from "@/lib/ui";

/** A round glass button with one icon. */
export function RoundButton({
  icon,
  label,
  onPress,
  disabled,
  size = 46,
}: {
  icon: IconName;
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
