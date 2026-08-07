import { describe, expect, it, vi } from "vitest";

import type { Account, Budget, Category, FinanceDataset, MonthlyFinancePlan, Transaction } from "@/src/features/finance/types";
import { completeOnboardingPreference } from "@/src/features/onboarding/onboardingCompletion";
import {
  dashboardRoute,
  firstAccountRoute,
  getAuthenticatedEntryDecision,
  getNextOnboardingIndex,
  getOnboardingExitHref,
  getPreviousOnboardingIndex,
  onboardingRoute,
  shouldIgnoreOnboardingExitPress,
  signInRoute,
} from "@/src/features/onboarding/onboardingRouting";
import {
  getLegacyWebOnboardingStorageKey,
  getLegacyWebSetupChecklistStorageKey,
  getOnboardingStorageKey,
  getSetupChecklistStorageKey,
  isStoredFlagComplete,
  isValidSecureStoreKey,
  migrateLegacyWebPreferences,
  onboardingCompleteStorageValue,
  readOnboardingPreferences,
} from "@/src/features/onboarding/onboardingStorage";
import { getSetupChecklistItems, isSetupChecklistComplete } from "@/src/features/onboarding/setupChecklist";

const secureStoreKeyPattern = /^[\w.-]+$/;
const realisticUuid = "123e4567-e89b-12d3-a456-426614174000";

describe("onboarding storage helpers", () => {
  it("uses user-scoped storage keys and explicit completion flags", () => {
    expect(getOnboardingStorageKey("user-a")).not.toBe(getOnboardingStorageKey("user-b"));
    expect(getSetupChecklistStorageKey("user-a")).not.toBe(getSetupChecklistStorageKey("user-b"));
    expect(isStoredFlagComplete("true")).toBe(true);
    expect(isStoredFlagComplete("false")).toBe(false);
    expect(isStoredFlagComplete(null)).toBe(false);
    expect(() => getOnboardingStorageKey("")).toThrow(/user id/);
    expect(() => getSetupChecklistStorageKey("")).toThrow(/user id/);
  });

  it("generates only SecureStore-safe preference keys", () => {
    const onboardingKey = getOnboardingStorageKey(realisticUuid);
    const checklistKey = getSetupChecklistStorageKey(realisticUuid);

    expect(onboardingKey).toMatch(secureStoreKeyPattern);
    expect(checklistKey).toMatch(secureStoreKeyPattern);
    expect(onboardingKey).not.toContain(":");
    expect(checklistKey).not.toContain(":");
    expect(onboardingKey).toBe(`money-heist.onboarding-complete.${realisticUuid}`);
    expect(checklistKey).toBe(`money-heist.setup-checklist-dismissed.${realisticUuid}`);
    expect(onboardingKey).not.toBe(checklistKey);

    expect(isValidSecureStoreKey("money-heist.onboarding-complete.user-a")).toBe(true);
    expect(isValidSecureStoreKey("money-heist:onboarding-complete:user-a")).toBe(false);
    expect(isValidSecureStoreKey("")).toBe(false);
  });

  it("rejects user ids that would produce an unsafe preference key", () => {
    expect(() => getOnboardingStorageKey("user:a")).toThrow(/not valid for secure storage/);
    expect(() => getSetupChecklistStorageKey("user:a")).toThrow(/not valid for secure storage/);
  });

  it("updates in-memory completion before persistence and writes the stable user-scoped key", async () => {
    const markComplete = vi.fn();
    const persist = vi.fn<(key: string, value: string) => Promise<void>>().mockResolvedValue(undefined);

    const result = await completeOnboardingPreference({ userId: "user-a", markComplete, persist });

    expect(result).toEqual({ ok: true });
    expect(markComplete.mock.invocationCallOrder[0]).toBeLessThan(persist.mock.invocationCallOrder[0]);
    expect(persist).toHaveBeenCalledWith(getOnboardingStorageKey("user-a"), onboardingCompleteStorageValue);
  });

  it("does not permanently trap the user when persistence fails", async () => {
    const markComplete = vi.fn();
    const persist = vi.fn<(key: string, value: string) => Promise<void>>().mockRejectedValue(new Error("storage failed"));

    const result = await completeOnboardingPreference({ userId: "user-a", markComplete, persist });

    expect(result.ok).toBe(false);
    expect(markComplete).toHaveBeenCalled();
  });

  it("does not write an invalid key before a user id exists", async () => {
    const markComplete = vi.fn();
    const persist = vi.fn<(key: string, value: string) => Promise<void>>().mockResolvedValue(undefined);

    const result = await completeOnboardingPreference({ userId: undefined, markComplete, persist });

    expect(result.ok).toBe(false);
    expect(markComplete).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });
});

describe("onboarding navigation helpers", () => {
  it("advances forward and backward through onboarding pages", () => {
    expect(getNextOnboardingIndex(0, 4)).toBe(1);
    expect(getNextOnboardingIndex(1, 4)).toBe(2);
    expect(getNextOnboardingIndex(2, 4)).toBe(3);
    expect(getNextOnboardingIndex(3, 4)).toBe(3);
    expect(getPreviousOnboardingIndex(3)).toBe(2);
    expect(getPreviousOnboardingIndex(0)).toBe(0);
  });

  it("uses replacement-safe exit destinations for skip, finish, replay and first-account actions", () => {
    expect(getOnboardingExitHref("dashboard")).toBe(dashboardRoute);
    expect(getOnboardingExitHref("first-account")).toBe(firstAccountRoute);
  });

  it("guards multiple rapid exit taps", () => {
    expect(shouldIgnoreOnboardingExitPress(false, false)).toBe(false);
    expect(shouldIgnoreOnboardingExitPress(true, false)).toBe(true);
    expect(shouldIgnoreOnboardingExitPress(false, true)).toBe(true);
  });
});

describe("onboarding route guard", () => {
  it("does not redirect while auth or onboarding state is unresolved", () => {
    expect(getAuthenticatedEntryDecision({ isAuthInitializing: true, isAuthenticated: false, onboardingStatus: "loading" })).toEqual({ kind: "loading" });
    expect(getAuthenticatedEntryDecision({ isAuthInitializing: false, isAuthenticated: true, onboardingStatus: "loading" })).toEqual({ kind: "loading" });
  });

  it("routes signed-out, incomplete and completed users correctly", () => {
    expect(getAuthenticatedEntryDecision({ isAuthInitializing: false, isAuthenticated: false, onboardingStatus: "signed-out" })).toEqual({ kind: "redirect", href: signInRoute });
    expect(getAuthenticatedEntryDecision({ isAuthInitializing: false, isAuthenticated: true, onboardingStatus: "incomplete" })).toEqual({ kind: "redirect", href: onboardingRoute });
    expect(getAuthenticatedEntryDecision({ isAuthInitializing: false, isAuthenticated: true, onboardingStatus: "complete" })).toEqual({ kind: "redirect", href: dashboardRoute });
  });
});

describe("onboarding persistence across a fresh lifecycle", () => {
  function createFakeStorage() {
    const map = new Map<string, string>();
    return {
      store: map,
      getValue: async (key: string) => map.get(key) ?? null,
      setValue: async (key: string, value: string) => {
        map.set(key, value);
      },
    };
  }

  it("completion survives a full provider/app restart lifecycle", async () => {
    const storage = createFakeStorage();

    const result = await completeOnboardingPreference({
      userId: realisticUuid,
      markComplete: () => undefined,
      persist: storage.setValue,
    });

    expect(result).toEqual({ ok: true });
    expect(storage.store.get(getOnboardingStorageKey(realisticUuid))).toBe(onboardingCompleteStorageValue);

    const flags = await readOnboardingPreferences(realisticUuid, storage.getValue);
    expect(flags.onboardingCompleted).toBe(true);
  });

  it("an incomplete first run stays incomplete after a fresh lifecycle", async () => {
    const storage = createFakeStorage();

    const flags = await readOnboardingPreferences(realisticUuid, storage.getValue);
    expect(flags.onboardingCompleted).toBe(false);
  });

  it("a storage read failure is distinguishable from a first run", async () => {
    const failingRead: (key: string) => Promise<string | null> = async () => {
      throw new Error("SecureStore could not read");
    };

    await expect(readOnboardingPreferences(realisticUuid, failingRead)).rejects.toThrow("SecureStore could not read");
  });
});

describe("setup checklist persistence", () => {
  function createFakeStorage() {
    const map = new Map<string, string>();
    return {
      store: map,
      getValue: async (key: string) => map.get(key) ?? null,
      setValue: async (key: string, value: string) => {
        map.set(key, value);
      },
    };
  }

  it("dismiss persists and is restored on a fresh lifecycle", async () => {
    const storage = createFakeStorage();
    const userBStorage = createFakeStorage();

    await storage.setValue(getSetupChecklistStorageKey(realisticUuid), "true");

    const flags = await readOnboardingPreferences(realisticUuid, storage.getValue);
    expect(flags.setupChecklistDismissed).toBe(true);

    const otherFlags = await readOnboardingPreferences(realisticUuid, userBStorage.getValue);
    expect(otherFlags.setupChecklistDismissed).toBe(false);
  });

  it("restore persists false and is respected on a fresh lifecycle", async () => {
    const storage = createFakeStorage();

    await storage.setValue(getSetupChecklistStorageKey(realisticUuid), "false");

    const flags = await readOnboardingPreferences(realisticUuid, storage.getValue);
    expect(flags.setupChecklistDismissed).toBe(false);
  });

  it("checklist preferences are user-scoped", async () => {
    const storage = createFakeStorage();

    await storage.setValue(getSetupChecklistStorageKey("user-a"), "true");

    const userA = await readOnboardingPreferences("user-a", storage.getValue);
    const userB = await readOnboardingPreferences("user-b", storage.getValue);

    expect(userA.setupChecklistDismissed).toBe(true);
    expect(userB.setupChecklistDismissed).toBe(false);
  });
});

describe("legacy web preference migration", () => {
  function createWebStorage() {
    const map = new Map<string, string>();
    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
      has: (key: string) => map.has(key),
    };
  }

  it("migrates legacy colon keys to the canonical secure keys", () => {
    const web = createWebStorage();

    web.setItem(getLegacyWebOnboardingStorageKey(realisticUuid), "true");
    web.setItem(getLegacyWebSetupChecklistStorageKey(realisticUuid), "false");

    const migratedCount = migrateLegacyWebPreferences(realisticUuid, web);

    expect(migratedCount).toBe(2);
    expect(web.getItem(getOnboardingStorageKey(realisticUuid))).toBe("true");
    expect(web.getItem(getSetupChecklistStorageKey(realisticUuid))).toBe("false");
    expect(web.has(getLegacyWebOnboardingStorageKey(realisticUuid))).toBe(false);
    expect(web.has(getLegacyWebSetupChecklistStorageKey(realisticUuid))).toBe(false);
  });

  it("does not overwrite an existing canonical value and removes the legacy key", () => {
    const web = createWebStorage();

    web.setItem(getLegacyWebOnboardingStorageKey(realisticUuid), "true");
    web.setItem(getOnboardingStorageKey(realisticUuid), "false");

    const migrated = migrateLegacyWebPreferences(realisticUuid, web);

    expect(migrated).toBe(0);
    expect(web.getItem(getOnboardingStorageKey(realisticUuid))).toBe("false");
    expect(web.has(getLegacyWebOnboardingStorageKey(realisticUuid))).toBe(false);
  });

  it("leaves storage untouched when no legacy keys exist", () => {
    const web = createWebStorage();

    const migrated = migrateLegacyWebPreferences(realisticUuid, web);

    expect(migrated).toBe(0);
    expect(web.has(getOnboardingStorageKey(realisticUuid))).toBe(false);
  });
});

describe("setup checklist", () => {
  it("derives incomplete setup from real records", () => {
    const items = getSetupChecklistItems(emptyDataset(), null);

    expect(items).toHaveLength(6);
    expect(items.every((item) => !item.isComplete)).toBe(true);
    expect(isSetupChecklistComplete(items)).toBe(false);
  });

  it("derives complete setup without storing financial details", () => {
    const items = getSetupChecklistItems(completeDataset(), plan);

    expect(items.every((item) => item.isComplete)).toBe(true);
    expect(isSetupChecklistComplete(items)).toBe(true);
  });

  it("routes the savings item to the correct first action", () => {
    expect(getSetupChecklistItems(emptyDataset(), null).find((item) => item.id === "savings")?.href).toBe("/accounts/new?savings=true");
    expect(getSetupChecklistItems({ ...emptyDataset(), accounts }, null).find((item) => item.id === "savings")?.href).toBe("/savings/new");
  });
});

const accounts: Account[] = [
  { id: "bank", name: "Bank", type: "bank", currency: "BDT", openingBalanceMinor: 0, isSavings: false, isArchived: false, createdAt: "2026-07-01T00:00:00Z" },
  { id: "savings", name: "Savings", type: "savings", currency: "BDT", openingBalanceMinor: 0, isSavings: true, isArchived: false, createdAt: "2026-07-01T00:00:00Z" },
];

const categories: Category[] = [
  { id: "salary", name: "Salary", kind: "income" },
  { id: "food", name: "Food", kind: "expense" },
];

const transactions: Transaction[] = [
  { id: "income", type: "income", accountId: "bank", categoryId: "salary", amountMinor: 1000, currency: "BDT", occurredAt: "2026-07-01", status: "active", createdAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-01T00:00:00Z" },
  { id: "expense", type: "expense", accountId: "bank", categoryId: "food", amountMinor: 500, currency: "BDT", occurredAt: "2026-07-01", status: "active", createdAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-01T00:00:00Z" },
];

const budget: Budget = {
  id: "budget",
  categoryId: "food",
  periodStart: "2026-07-01",
  periodEnd: "2026-07-31",
  limitMinor: 10000,
  currency: "BDT",
  status: "active",
};

const plan: MonthlyFinancePlan = {
  id: "plan",
  monthStart: "2026-07-01",
  currency: "BDT",
  expectedRemainingIncomeMinor: 0,
  upcomingFixedExpensesMinor: 0,
  debtObligationsMinor: 0,
  safetyBufferMinor: 0,
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
};

function emptyDataset(): FinanceDataset {
  return {
    currency: "BDT",
    accounts: [],
    categories,
    transactions: [],
    budgets: [],
    savingsGoals: [],
    forecast: {
      currency: "BDT",
      availableLiquidCashMinor: 0,
      expectedRemainingIncomeMinor: 0,
      upcomingFixedExpensesMinor: 0,
      remainingVariableBudgetMinor: 0,
      debtObligationsMinor: 0,
      safetyBufferMinor: 0,
    },
  };
}

function completeDataset(): FinanceDataset {
  return {
    ...emptyDataset(),
    accounts,
    transactions,
    budgets: [budget],
    savingsGoals: [{ id: "goal", name: "Emergency", targetMinor: 10000, currency: "BDT", status: "active", linkedAccountId: "savings" }],
  };
}
