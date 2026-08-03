import { Redirect } from "expo-router";

import { AppStateMessage } from "@/src/components/AppStateMessage";
import { useOnboarding } from "@/src/features/onboarding/OnboardingProvider";
import { getAuthenticatedEntryDecision } from "@/src/features/onboarding/onboardingRouting";
import { useAuth } from "@/src/providers/AuthProvider";

export default function Index() {
  const { isAuthenticated, isInitializing: isAuthInitializing } = useAuth();
  const { status: onboardingStatus } = useOnboarding();
  const decision = getAuthenticatedEntryDecision({
    isAuthInitializing,
    isAuthenticated,
    onboardingStatus,
  });

  if (decision.kind === "loading") {
    return <AppStateMessage loading title="Getting started" message="Preparing your app guide." />;
  }

  return <Redirect href={decision.href} />;
}
