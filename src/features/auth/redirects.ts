import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

import { buildRedirectUrl } from "@/src/features/auth/redirectHelpers";

const fallbackScheme = "moneyheist";

export function getAuthRedirectUrl(path = "/dashboard", origin?: string) {
  if (origin) {
    return buildRedirectUrl(origin, path);
  }

  if (Platform.OS === "web") {
    const webOrigin =
      typeof globalThis.location === "object" && globalThis.location ? globalThis.location.origin : undefined;

    return webOrigin ? buildRedirectUrl(webOrigin, path) : Linking.createURL(path);
  }

  const configuredScheme = Constants.expoConfig?.scheme;
  const scheme = Array.isArray(configuredScheme) ? configuredScheme[0] : configuredScheme ?? fallbackScheme;

  return `${scheme}://${path.replace(/^\//, "")}`;
}

export function getPasswordResetRedirectUrl(origin?: string) {
  return getAuthRedirectUrl("/reset-password", origin);
}
