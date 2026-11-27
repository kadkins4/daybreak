import { useRouter } from "expo-router";
import { View } from "react-native";

import { JourneyFlight } from "@/components/JourneyFlight";
import { JourneyLanded } from "@/components/JourneyLanded";
import { JourneyPicker } from "@/components/JourneyPicker";
import { useJourneys } from "@/lib/journey";
import { useSky } from "@/lib/sky";
import { usePageTitle } from "@/lib/title";

/**
 * Journey: the flight when one is in the air, the summary when one has just
 * ended, and otherwise the map for picking the next one.
 */
export default function Journey() {
  usePageTitle("Journey · Daybreak");
  const router = useRouter();
  const { base } = useSky();
  const { ready, active, summary, dismissSummary } = useJourneys();
  const toToday = () =>
    router.canGoBack() ? router.back() : router.replace("/");

  if (active) return <JourneyFlight journey={active} onMinimize={toToday} />;
  if (!ready) return <View style={{ flex: 1, backgroundColor: base }} />;
  if (summary) {
    return (
      <JourneyLanded
        journey={summary}
        onAgain={dismissSummary}
        onToday={() => {
          dismissSummary();
          toToday();
        }}
      />
    );
  }
  return <JourneyPicker onBack={toToday} />;
}
