import { useEffect } from "react";
import { Platform } from "react-native";

/** Sets the browser tab's title for the current screen. */
export function usePageTitle(title: string) {
  useEffect(() => {
    if (Platform.OS === "web") document.title = title;
  }, [title]);
}
