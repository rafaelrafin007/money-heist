import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { completeOnboardingPreference, type OnboardingCompletionResult } from "@/src/features/onboarding/onboardingCompletion";
import type { OnboardingStatus } from "@/src/features/onboarding/onboardingRouting";
import {
  getOnboardingStorageKey,
  getSetupChecklistStorageKey,
  isStoredFlagComplete,
} from "@/src/features/onboarding/onboardingStorage";
import { getLocalAppValue, setLocalAppValue } from "@/src/lib/localAppStorage";
import { useAuth } from "@/src/providers/AuthProvider";

type OnboardingContextValue = {
  status: OnboardingStatus;
  isInitializing: boolean;
  hasCompletedOnboarding: boolean;
  isSetupChecklistDismissed: boolean;
  completeOnboarding: () => Promise<OnboardingCompletionResult>;
  dismissSetupChecklist: () => Promise<void>;
  showSetupChecklist: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

type OnboardingProviderProps = {
  children: React.ReactNode;
};

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user, isInitializing: isAuthInitializing } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus>("loading");
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isSetupChecklistDismissed, setIsSetupChecklistDismissed] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadState(userId: string) {
      setStatus("loading");

      try {
        const [onboardingValue, checklistValue] = await Promise.all([
          getLocalAppValue(getOnboardingStorageKey(userId)),
          getLocalAppValue(getSetupChecklistStorageKey(userId)),
        ]);

        if (!isActive) {
          return;
        }

        const isComplete = isStoredFlagComplete(onboardingValue);
        setHasCompletedOnboarding(isComplete);
        setIsSetupChecklistDismissed(isStoredFlagComplete(checklistValue));
        setStatus(isComplete ? "complete" : "incomplete");
      } catch {
        if (!isActive) {
          return;
        }

        setHasCompletedOnboarding(false);
        setIsSetupChecklistDismissed(false);
        setStatus("incomplete");
      }
    }

    if (isAuthInitializing) {
      setStatus("loading");
      return () => {
        isActive = false;
      };
    }

    if (!user?.id) {
      setHasCompletedOnboarding(false);
      setIsSetupChecklistDismissed(false);
      setStatus("signed-out");
      return () => {
        isActive = false;
      };
    }

    void loadState(user.id);

    return () => {
      isActive = false;
    };
  }, [isAuthInitializing, user?.id]);

  const completeOnboarding = useCallback(async () => {
    return completeOnboardingPreference({
      userId: user?.id,
      markComplete: () => {
        setHasCompletedOnboarding(true);
        setStatus("complete");
      },
      persist: setLocalAppValue,
    });
  }, [user?.id]);

  const dismissSetupChecklist = useCallback(async () => {
    if (!user?.id) return;
    await setLocalAppValue(getSetupChecklistStorageKey(user.id), "true");
    setIsSetupChecklistDismissed(true);
  }, [user?.id]);

  const showSetupChecklist = useCallback(async () => {
    if (!user?.id) return;
    await setLocalAppValue(getSetupChecklistStorageKey(user.id), "false");
    setIsSetupChecklistDismissed(false);
  }, [user?.id]);

  const value = useMemo(
    () => ({
      status,
      isInitializing: status === "loading",
      hasCompletedOnboarding,
      isSetupChecklistDismissed,
      completeOnboarding,
      dismissSetupChecklist,
      showSetupChecklist,
    }),
    [
      completeOnboarding,
      dismissSetupChecklist,
      hasCompletedOnboarding,
      isSetupChecklistDismissed,
      showSetupChecklist,
      status,
    ],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used inside OnboardingProvider.");
  }
  return context;
}
