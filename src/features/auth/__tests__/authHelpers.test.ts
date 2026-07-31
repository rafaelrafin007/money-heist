import { describe, expect, it } from "vitest";

import { toSafeAuthErrorMessage } from "@/src/features/auth/authErrors";
import { buildRedirectUrl } from "@/src/features/auth/redirectHelpers";
import { mapProfileRow } from "@/src/features/auth/types/profile";
import { validateResetPassword } from "@/src/features/auth/validation";
import { validateSupabaseEnvironment } from "@/src/lib/env";

describe("auth environment validation", () => {
  it("accepts Supabase URL and publishable key", () => {
    expect(
      validateSupabaseEnvironment({
        EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      }),
    ).toEqual({
      supabaseUrl: "https://project.supabase.co",
      supabasePublishableKey: "publishable-key",
    });
  });

  it("supports the anon-key fallback without requiring both keys", () => {
    expect(
      validateSupabaseEnvironment({
        EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
        EXPO_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }).supabasePublishableKey,
    ).toBe("anon-key");
  });

  it("rejects missing Supabase values", () => {
    expect(() => validateSupabaseEnvironment({})).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
    expect(() =>
      validateSupabaseEnvironment({
        EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      }),
    ).toThrow(/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });
});

describe("profile mapping", () => {
  it("maps a profile database row into domain state", () => {
    expect(
      mapProfileRow({
        id: "user-id",
        full_name: "Ada Lovelace",
        currency_code: "BDT",
        timezone: "Asia/Dhaka",
        financial_month_start_day: 1,
        created_at: "2026-07-31T00:00:00Z",
        updated_at: "2026-07-31T00:00:00Z",
      }),
    ).toEqual({
      id: "user-id",
      fullName: "Ada Lovelace",
      currencyCode: "BDT",
      timezone: "Asia/Dhaka",
      financialMonthStartDay: 1,
      createdAt: "2026-07-31T00:00:00Z",
      updatedAt: "2026-07-31T00:00:00Z",
    });
  });

  it("throws when required profile fields are missing", () => {
    expect(() => mapProfileRow({ id: "user-id" })).toThrow(/Profile field/);
  });
});

describe("auth error mapping", () => {
  it("maps backend errors to safe user-facing messages", () => {
    expect(toSafeAuthErrorMessage(new Error("Invalid login credentials"))).toBe(
      "The email or password is incorrect.",
    );
    expect(toSafeAuthErrorMessage(new Error("Email not confirmed"))).toBe(
      "Please verify your email before signing in.",
    );
  });
});

describe("password validation", () => {
  it("validates reset password requirements", () => {
    expect(validateResetPassword({ password: "short", confirmPassword: "short" }).password).toBeDefined();
    expect(validateResetPassword({ password: "Strong123", confirmPassword: "Different123" }).confirmPassword).toBeDefined();
    expect(validateResetPassword({ password: "Strong123", confirmPassword: "Strong123" })).toEqual({});
  });
});

describe("redirect helpers", () => {
  it("builds a web password reset redirect URL", () => {
    expect(buildRedirectUrl("http://localhost:8081", "/reset-password")).toBe("http://localhost:8081/reset-password");
  });
});
