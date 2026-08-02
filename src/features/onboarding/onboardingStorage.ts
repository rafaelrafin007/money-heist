export function getOnboardingStorageKey(userId: string) {
  return `money-heist:onboarding-complete:${userId}`;
}

export function getSetupChecklistStorageKey(userId: string) {
  return `money-heist:setup-checklist-dismissed:${userId}`;
}

export function isStoredFlagComplete(value: string | null) {
  return value === "true";
}
