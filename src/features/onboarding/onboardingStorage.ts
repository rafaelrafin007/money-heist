export const onboardingCompleteStorageValue = "true";

export function getOnboardingStorageKey(userId: string) {
  if (!userId) {
    throw new Error("A signed-in user id is required for onboarding storage.");
  }
  return `money-heist:onboarding-complete:${userId}`;
}

export function getSetupChecklistStorageKey(userId: string) {
  if (!userId) {
    throw new Error("A signed-in user id is required for setup checklist storage.");
  }
  return `money-heist:setup-checklist-dismissed:${userId}`;
}

export function isStoredFlagComplete(value: string | null) {
  return value === onboardingCompleteStorageValue;
}
