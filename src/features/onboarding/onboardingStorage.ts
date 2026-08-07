const secureStoreKeyPattern = /^[\w.-]+$/;

export const onboardingCompleteStorageValue = "true";

export function isValidSecureStoreKey(key: string) {
  return secureStoreKeyPattern.test(key);
}

function assertSecureStorageSafeKey(key: string) {
  if (!isValidSecureStoreKey(key)) {
    throw new Error(`Generated preference key is not valid for secure storage: "${key}".`);
  }
}

export function getOnboardingStorageKey(userId: string) {
  if (!userId) {
    throw new Error("A signed-in user id is required for onboarding storage.");
  }
  const key = `money-heist.onboarding-complete.${userId}`;
  assertSecureStorageSafeKey(key);
  return key;
}

export function getLegacyWebOnboardingStorageKey(userId: string) {
  if (!userId) {
    throw new Error("A signed-in user id is required for onboarding storage.");
  }
  return `money-heist:onboarding-complete:${userId}`;
}

export function getSetupChecklistStorageKey(userId: string) {
  if (!userId) {
    throw new Error("A signed-in user id is required for setup checklist storage.");
  }
  const key = `money-heist.setup-checklist-dismissed.${userId}`;
  assertSecureStorageSafeKey(key);
  return key;
}

export function getLegacyWebSetupChecklistStorageKey(userId: string) {
  if (!userId) {
    throw new Error("A signed-in user id is required for setup checklist storage.");
  }
  return `money-heist:setup-checklist-dismissed:${userId}`;
}

export function isStoredFlagComplete(value: string | null) {
  return value === onboardingCompleteStorageValue;
}

export type OnboardingPreferenceFlags = {
  onboardingCompleted: boolean;
  setupChecklistDismissed: boolean;
};

export async function readOnboardingPreferences(
  userId: string,
  getValue: (key: string) => Promise<string | null>,
): Promise<OnboardingPreferenceFlags> {
  const [onboardingValue, checklistValue] = await Promise.all([
    getValue(getOnboardingStorageKey(userId)),
    getValue(getSetupChecklistStorageKey(userId)),
  ]);

  return {
    onboardingCompleted: isStoredFlagComplete(onboardingValue),
    setupChecklistDismissed: isStoredFlagComplete(checklistValue),
  };
}

export function migrateLegacyWebPreferences(
  userId: string,
  storage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  },
): number {
  const legacyPairs: { legacyKey: string; canonicalKey: string }[] = [
    {
      legacyKey: getLegacyWebOnboardingStorageKey(userId),
      canonicalKey: getOnboardingStorageKey(userId),
    },
    {
      legacyKey: getLegacyWebSetupChecklistStorageKey(userId),
      canonicalKey: getSetupChecklistStorageKey(userId),
    },
  ];

  let migratedCount = 0;

  for (const { legacyKey, canonicalKey } of legacyPairs) {
    const legacyValue = storage.getItem(legacyKey);

    if (legacyValue === null) {
      continue;
    }

    if (storage.getItem(canonicalKey) === null) {
      storage.setItem(canonicalKey, legacyValue);
      migratedCount += 1;
    }

    storage.removeItem(legacyKey);
  }

  return migratedCount;
}
