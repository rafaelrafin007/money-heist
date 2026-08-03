import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export async function getLocalAppValue(key: string) {
  if (Platform.OS === "web") {
    return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

export async function setLocalAppValue(key: string, value: string) {
  if (Platform.OS === "web") {
    if (typeof globalThis.localStorage !== "undefined") {
      globalThis.localStorage.setItem(key, value);
    }
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function removeLocalAppValue(key: string) {
  if (Platform.OS === "web") {
    if (typeof globalThis.localStorage !== "undefined") {
      globalThis.localStorage.removeItem(key);
    }
    return;
  }

  await SecureStore.deleteItemAsync(key);
}
