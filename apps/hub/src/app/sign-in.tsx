import { STOPS, css } from "@hub/core";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { useSession } from "@/lib/session";
import { color, font, tile, web } from "@/lib/ui";
import { usePageTitle } from "@/lib/title";

const morning = STOPS.morning;

const input = {
  height: 52,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: color.border,
  backgroundColor: "rgba(255,255,255,0.06)",
  paddingHorizontal: 16,
  fontFamily: font.regular,
  fontSize: 17,
  color: color.text,
} as const;

const fieldLabel = {
  fontFamily: font.medium,
  fontSize: 14,
  color: color.muted,
  marginBottom: 6,
} as const;

export default function SignIn() {
  usePageTitle("Sign in · Hub");
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy || !email || !password) return;
    setBusy(true);
    setProblem(await signIn(email, password));
    setBusy(false);
  };

  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          backgroundColor: css(morning.base),
        },
        web({
          backgroundImage:
            "radial-gradient(120% 75% at 50% 118%, " +
            `${css(morning.glow)} 0%, ${css(morning.glow, 0.42)} 26%, ` +
            `${css(morning.glow, 0)} 62%)`,
        }),
      ]}
    >
      <View style={[tile(28), { width: "100%", maxWidth: 380, padding: 28 }]}>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: font.semibold, fontSize: 32, color: color.text }}
        >
          Hub
        </Text>
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 15,
            color: color.muted,
            marginTop: 4,
            marginBottom: 24,
          }}
        >
          Sign in to see Today.
        </Text>

        <Text style={fieldLabel} nativeID="email-label">
          Email
        </Text>
        <TextInput
          aria-labelledby="email-label"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          style={input}
        />

        <Text style={[fieldLabel, { marginTop: 16 }]} nativeID="password-label">
          Password
        </Text>
        <TextInput
          aria-labelledby="password-label"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={submit}
          style={input}
        />

        {problem ? (
          <Text
            accessibilityRole="alert"
            style={{
              fontFamily: font.regular,
              fontSize: 14,
              color: "#ffb3a1",
              marginTop: 14,
            }}
          >
            {problem}
          </Text>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => ({
            height: 52,
            borderRadius: 16,
            marginTop: 24,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: css(morning.accent),
            opacity: busy || pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: font.semibold,
              fontSize: 17,
              color: color.accentInk,
            }}
          >
            {busy ? "Signing in" : "Sign in"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
