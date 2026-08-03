import { Redirect, Stack, usePathname } from "expo-router";

import { AppStateMessage } from "@/src/components/AppStateMessage";
import { useOnboarding } from "@/src/features/onboarding/OnboardingProvider";
import { onboardingRoute } from "@/src/features/onboarding/onboardingRouting";

export default function AppLayout() {
  const pathname = usePathname();
  const { status } = useOnboarding();
  const isOnboardingRoute = pathname === onboardingRoute;

  if (status === "loading") {
    return <AppStateMessage loading title="Getting started" message="Preparing your app guide." />;
  }

  if (status === "incomplete" && !isOnboardingRoute) {
    return <Redirect href={onboardingRoute} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
