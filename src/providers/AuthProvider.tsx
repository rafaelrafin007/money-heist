import { type Session, type User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { toSafeAuthErrorMessage, getErrorMessage } from "@/src/features/auth/authErrors";
import { getAuthRedirectUrl, getPasswordResetRedirectUrl } from "@/src/features/auth/redirects";
import { mapProfileRow, type UserProfile } from "@/src/features/auth/types/profile";
import { getSupabaseClient } from "@/src/lib/supabase";

type AuthActionResult =
  | { ok: true; message?: string; verificationRequired?: boolean }
  | { ok: false; message: string };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isInitializing: boolean;
  isAuthenticated: boolean;
  configurationError: string | null;
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (input: { fullName: string; email: string; password: string }) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  requestPasswordReset: (email: string) => Promise<AuthActionResult>;
  updatePassword: (password: string) => Promise<AuthActionResult>;
  refreshProfile: () => Promise<AuthActionResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const loadProfileForUser = useCallback(async (userId: string) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, currency_code, timezone, financial_month_start_day, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("Your profile is not ready yet. Please try again in a moment.");
    }

    return mapProfileRow(data);
  }, []);

  const applySession = useCallback(
    async (nextSession: Session | null) => {
      if (!mountedRef.current) {
        return;
      }

      setSession(nextSession);

      if (!nextSession?.user) {
        setProfile(null);
        setProfileError(null);
        return;
      }

      try {
        const nextProfile = await loadProfileForUser(nextSession.user.id);

        if (mountedRef.current) {
          setProfile(nextProfile);
          setProfileError(null);
        }
      } catch (error) {
        if (mountedRef.current) {
          setProfile(null);
          setProfileError(toSafeAuthErrorMessage(error));
        }
      }
    },
    [loadProfileForUser],
  );

  useEffect(() => {
    mountedRef.current = true;
    let subscription: { unsubscribe: () => void } | null = null;

    async function initialize() {
      try {
        const supabase = getSupabaseClient();
        subscription = supabase.auth.onAuthStateChange((_event, nextSession) => {
          void applySession(nextSession);
        }).data.subscription;

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        await applySession(data.session);
      } catch (error) {
        if (mountedRef.current) {
          setConfigurationError(getErrorMessage(error));
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (mountedRef.current) {
          setIsInitializing(false);
        }
      }
    }

    void initialize();

    return () => {
      mountedRef.current = false;
      subscription?.unsubscribe();
    };
  }, [applySession]);

  const refreshProfile = useCallback(async (): Promise<AuthActionResult> => {
    if (!session?.user) {
      return { ok: false, message: "You must be signed in to load a profile." };
    }

    try {
      const nextProfile = await loadProfileForUser(session.user.id);
      setProfile(nextProfile);
      setProfileError(null);
      return { ok: true };
    } catch (error) {
      const message = toSafeAuthErrorMessage(error);
      setProfileError(message);
      return { ok: false, message };
    }
  }, [loadProfileForUser, session?.user]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        await applySession(data.session);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: toSafeAuthErrorMessage(error) };
      }
    },
    [applySession],
  );

  const signUp = useCallback(
    async (input: { fullName: string; email: string; password: string }): Promise<AuthActionResult> => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signUp({
          email: input.email.trim(),
          password: input.password,
          options: {
            data: {
              full_name: input.fullName.trim(),
            },
            emailRedirectTo: getAuthRedirectUrl("/dashboard"),
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          await applySession(data.session);
          return { ok: true };
        }

        return {
          ok: true,
          verificationRequired: true,
          message: "Check your email to verify your account before signing in.",
        };
      } catch (error) {
        return { ok: false, message: toSafeAuthErrorMessage(error) };
      }
    },
    [applySession],
  );

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      await applySession(null);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: toSafeAuthErrorMessage(error) };
    }
  }, [applySession]);

  const requestPasswordReset = useCallback(async (email: string): Promise<AuthActionResult> => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getPasswordResetRedirectUrl(),
      });

      if (error) {
        throw error;
      }

      return {
        ok: true,
        message: "If an account exists for that email, password reset instructions will be sent.",
      };
    } catch (error) {
      return { ok: false, message: toSafeAuthErrorMessage(error) };
    }
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<AuthActionResult> => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      return { ok: true, message: "Your password has been updated." };
    } catch (error) {
      return { ok: false, message: toSafeAuthErrorMessage(error) };
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isInitializing,
      isAuthenticated: Boolean(session?.user),
      configurationError,
      profileError,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      refreshProfile,
    }),
    [
      configurationError,
      isInitializing,
      profile,
      profileError,
      refreshProfile,
      requestPasswordReset,
      session,
      signIn,
      signOut,
      signUp,
      updatePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
