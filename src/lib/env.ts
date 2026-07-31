export type SupabaseEnvironment = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

type EnvironmentInput = {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
};

export function validateSupabaseEnvironment(input: EnvironmentInput): SupabaseEnvironment {
  const supabaseUrl = input.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const preferredKey = input.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  const fallbackKey = input.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const supabasePublishableKey = preferredKey || fallbackKey;

  if (!supabaseUrl) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL. Add it to .env and restart Expo.");
  }

  if (!supabaseUrl.startsWith("https://") || !supabaseUrl.includes(".supabase.")) {
    throw new Error("EXPO_PUBLIC_SUPABASE_URL must be a valid Supabase project URL.");
  }

  if (!supabasePublishableKey) {
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add the Supabase publishable/anon key to .env and restart Expo.",
    );
  }

  return {
    supabaseUrl,
    supabasePublishableKey,
  };
}

export function getSupabaseEnvironment() {
  return validateSupabaseEnvironment({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
}
