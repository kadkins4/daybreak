import { Stack } from "expo-router";

import { useMemo } from "react";

import { DaybreakDataProvider } from "@/lib/daybreak-data";
import { JourneyProvider, databaseStore } from "@/lib/journey";
import { useSession } from "@/lib/session";
import { SkyProvider } from "@/lib/sky";

export default function AppLayout() {
  const { session } = useSession();
  const userId = session?.user.id;
  const journeys = useMemo(
    () => (userId ? databaseStore(userId) : null),
    [userId]
  );
  if (!session || !journeys) return null;
  return (
    <DaybreakDataProvider userId={session.user.id}>
      <SkyProvider>
        <JourneyProvider store={journeys} cacheKey={session.user.id}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "transparent" },
            }}
          >
            <Stack.Screen name="index" options={{ title: "Daybreak" }} />
            <Stack.Screen
              name="journey"
              options={{ title: "Journey · Daybreak" }}
            />
            <Stack.Screen
              name="habits"
              options={{ title: "Habits · Daybreak" }}
            />
          </Stack>
        </JourneyProvider>
      </SkyProvider>
    </DaybreakDataProvider>
  );
}
