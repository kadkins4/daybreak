import { Stack } from "expo-router";

import { DaybreakDataProvider } from "@/lib/daybreak-data";
import { useSession } from "@/lib/session";
import { SkyProvider } from "@/lib/sky";

export default function AppLayout() {
  const { session } = useSession();
  if (!session) return null;
  return (
    <DaybreakDataProvider userId={session.user.id}>
      <SkyProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
          }}
        >
          <Stack.Screen name="index" options={{ title: "Daybreak" }} />
          <Stack.Screen
            name="habits"
            options={{ title: "Habits · Daybreak" }}
          />
        </Stack>
      </SkyProvider>
    </DaybreakDataProvider>
  );
}
