import AsyncStorage from "@react-native-async-storage/async-storage";

/** Read a saved JSON value, or null when there is none or it cannot be read. */
export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked. Today still works without it.
  }
}
