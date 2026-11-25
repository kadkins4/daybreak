import { Stack } from "expo-router";

import { HubDataProvider } from "@/lib/hub-data";
import { useSession } from "@/lib/session";
import { SkyProvider } from "@/lib/sky";

export default function AppLayout() {
  const { session } = useSession();
  if (!session) return null;
  return (
    <HubDataProvider userId={session.user.id}>
      <SkyProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
          }}
        >
          <Stack.Screen name="index" options={{ title: "Today · Hub" }} />
          <Stack.Screen name="habits" options={{ title: "Habits · Hub" }} />
        </Stack>
      </SkyProvider>
    </HubDataProvider>
  );
}
