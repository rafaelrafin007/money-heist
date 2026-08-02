import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getLocalAppValue, setLocalAppValue } from "@/src/lib/localAppStorage";
import { useAuth } from "@/src/providers/AuthProvider";
import {
  getOnboardingStorageKey,
  getSetupChecklistStorageKey,
  isStoredFlagComplete,
} from "@/src/features/onboarding/onboardingStorage";

type OnboardingContextValue = {
  isInitializing: boolean;
  hasCompletedOnboarding: boolean;
  isSetupChecklistDismissed: boolean;
  completeOnboarding: () => Promise<void>;
  dismissSetupChecklist: () => Promise<void>;
  showSetupChecklist: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

type OnboardingProviderProps = {
  children: React.ReactNode;
};

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { user } = useAuth();
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isSetupChecklistDismissed, setIsSetupChecklistDismissed] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadState(userId: string) {
      setIsInitializing(true);
      try {
        const [onboardingValue, checklistValue] = await Promise.all([
          getLocalAppValue(getOnboardingStorageKey(userId)),
          getLocalAppValue(getSetupChecklistStorageKey(userId)),
        ]);

        if (isActive) {
          setHasCompletedOnboarding(isStoredFlagComplete(onboardingValue));
          setIsSetupChecklistDismissed(isStoredFlagComplete(checklistValue));
        }
      } finally {
        if (isActive) {
          setIsInitializing(false);
        }
      }
    }

    if (!user?.id) {
      setHasCompletedOnboarding(false);
      setIsSetupChecklistDismissed(false);
      setIsInitializing(false);
      return () => {
        isActive = false;
      };
    }

    void loadState(user.id);

    return () => {
      isActive = false;
    };
  }, [user?.id]);

  const completeOnboarding = useCallback(async () => {
    if (!user?.id) return;
    await setLocalAppValue(getOnboardingStorageKey(user.id), "true");
    setHasCompletedOnboarding(true);
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
      isInitializing,
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
      isInitializing,
      isSetupChecklistDismissed,
      showSetupChecklist,
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
