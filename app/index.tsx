import { Redirect } from "expo-router";

import { AppStateMessage } from "@/src/components/AppStateMessage";
import { useOnboarding } from "@/src/features/onboarding/OnboardingProvider";
import { useAuth } from "@/src/providers/AuthProvider";

export default function Index() {
  const { isAuthenticated } = useAuth();
  const { hasCompletedOnboarding, isInitializing } = useOnboarding();

  if (isAuthenticated && isInitializing) {
    return <AppStateMessage loading title="Getting started" message="Preparing your app guide." />;
  }

  if (isAuthenticated && !hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href={isAuthenticated ? "/dashboard" : "/sign-in"} />;
}
