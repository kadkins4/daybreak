import { formatTodayHeading } from "@hub/core";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Today
      </Text>
      <Text style={styles.date}>{formatTodayHeading(new Date())}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontSize: 40,
    fontWeight: "700",
  },
  date: {
    fontSize: 18,
    color: "#555",
  },
});
