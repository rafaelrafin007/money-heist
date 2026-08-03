export const dashboardRoute = "/dashboard";
export const onboardingRoute = "/onboarding";
export const signInRoute = "/sign-in";
export const firstAccountRoute = "/accounts/new";

export type OnboardingStatus = "loading" | "signed-out" | "complete" | "incomplete";
export type OnboardingExitTarget = "dashboard" | "first-account";

export type AuthenticatedEntryDecision =
  | { kind: "loading" }
  | { kind: "redirect"; href: typeof dashboardRoute | typeof onboardingRoute | typeof signInRoute };

export function getAuthenticatedEntryDecision({
  isAuthInitializing,
  isAuthenticated,
  onboardingStatus,
}: {
  isAuthInitializing: boolean;
  isAuthenticated: boolean;
  onboardingStatus: OnboardingStatus;
}): AuthenticatedEntryDecision {
  if (isAuthInitializing || (isAuthenticated && onboardingStatus === "loading")) {
    return { kind: "loading" };
  }

  if (!isAuthenticated) {
    return { kind: "redirect", href: signInRoute };
  }

  if (onboardingStatus === "incomplete") {
    return { kind: "redirect", href: onboardingRoute };
  }

  return { kind: "redirect", href: dashboardRoute };
}

export function getOnboardingExitHref(target: OnboardingExitTarget) {
  return target === "first-account" ? firstAccountRoute : dashboardRoute;
}

export function getNextOnboardingIndex(currentIndex: number, stepCount: number) {
  return Math.min(stepCount - 1, currentIndex + 1);
}

export function getPreviousOnboardingIndex(currentIndex: number) {
  return Math.max(0, currentIndex - 1);
}

export function shouldIgnoreOnboardingExitPress(isCompleting: boolean, hasNavigated: boolean) {
  return isCompleting || hasNavigated;
}
