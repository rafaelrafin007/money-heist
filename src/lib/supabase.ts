import "react-native-url-polyfill/auto";

import { processLock } from "@supabase/auth-js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import { getSupabaseEnvironment } from "@/src/lib/env";
import { getSupabaseStorage } from "@/src/lib/supabaseStorage";

let supabaseClient: SupabaseClient | null = null;
let appStateListenerStarted = false;

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const environment = getSupabaseEnvironment();

  supabaseClient = createClient(environment.supabaseUrl, environment.supabasePublishableKey, {
    auth: {
      storage: getSupabaseStorage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web" && typeof globalThis.window !== "undefined",
      lock: processLock,
    },
  });

  if (Platform.OS !== "web" && !appStateListenerStarted) {
    appStateListenerStarted = true;
    AppState.addEventListener("change", (state) => {
      if (!supabaseClient) {
        return;
      }

      if (state === "active") {
        supabaseClient.auth.startAutoRefresh();
      } else {
        supabaseClient.auth.stopAutoRefresh();
      }
    });
  }

  return supabaseClient;
}
