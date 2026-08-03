import { getOnboardingStorageKey, onboardingCompleteStorageValue } from "@/src/features/onboarding/onboardingStorage";

export type OnboardingCompletionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function completeOnboardingPreference({
  userId,
  markComplete,
  persist,
}: {
  userId: string | undefined;
  markComplete: () => void;
  persist: (key: string, value: string) => Promise<void>;
}): Promise<OnboardingCompletionResult> {
  if (!userId) {
    return { ok: false, message: "You need to be signed in to save onboarding progress." };
  }

  markComplete();

  try {
    await persist(getOnboardingStorageKey(userId), onboardingCompleteStorageValue);
    return { ok: true };
  } catch {
    return { ok: false, message: "Your guide progress could not be saved on this device." };
  }
}
