import { Stack } from "expo-router";

import { TodayDataProvider } from "@/lib/today-data";
import { useSession } from "@/lib/session";
import { SkyProvider } from "@/lib/sky";

export default function AppLayout() {
  const { session } = useSession();
  if (!session) return null;
  return (
    <TodayDataProvider userId={session.user.id}>
      <SkyProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
          }}
        >
          <Stack.Screen name="index" options={{ title: "Today" }} />
          <Stack.Screen name="habits" options={{ title: "Habits · Today" }} />
        </Stack>
      </SkyProvider>
    </TodayDataProvider>
  );
}
