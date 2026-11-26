import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, Text, View } from "react-native";

import { SessionProvider, useSession } from "@/lib/session";
import { isConfigured } from "@/lib/supabase";
import { color } from "@/lib/ui";

void SplashScreen.preventAutoHideAsync();

const BASE = "#0b0a09";

function Screens() {
  const { session, loading } = useSession();
  if (loading) return <View style={{ flex: 1, backgroundColor: BASE }} />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: BASE },
      }}
    >
      <Stack.Protected guard={session !== null}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={session === null}>
        <Stack.Screen
          name="sign-in"
          options={{ title: "Sign in · Daybreak" }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const ready = loaded || error !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // Tell iPhones which icon and name to use for "Add to Home Screen".
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const add = (tag: "link" | "meta", attributes: Record<string, string>) => {
      const element = document.createElement(tag);
      for (const [name, value] of Object.entries(attributes)) {
        element.setAttribute(name, value);
      }
      document.head.appendChild(element);
    };
    add("link", { rel: "apple-touch-icon", href: "/apple-touch-icon.png" });
    add("meta", { name: "apple-mobile-web-app-title", content: "Daybreak" });
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: BASE }} />;

  if (!isConfigured) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: BASE,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <Text style={{ color: color.text, fontSize: 18, textAlign: "center" }}>
          Daybreak is not connected to its backend yet. Set
          EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          then rebuild.
        </Text>
      </View>
    );
  }

  return (
    <SessionProvider>
      <StatusBar style="light" />
      <Screens />
    </SessionProvider>
  );
}
