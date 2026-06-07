import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const LEGACY_STORAGE_KEYS = [
  "extasy.session.user",
  "extasy.local.accounts",
  "extasy.likes",
  "extasy.like.requests",
  "extasy.viewed.notifications",
  "extasy.matches",
  "extasy.messages",
  "extasy.blocked.users",
];

let cleanupPromise: Promise<void> | null = null;

export function clearLegacyStorage() {
  if (cleanupPromise) {
    return cleanupPromise;
  }

  cleanupPromise = (async () => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") {
        return;
      }

      LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
      return;
    }

    await Promise.all(
      LEGACY_STORAGE_KEYS.map((key) => SecureStore.deleteItemAsync(key)),
    );
  })();

  return cleanupPromise;
}
