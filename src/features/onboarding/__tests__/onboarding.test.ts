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
  getOnboardingStorageKey,
  getSetupChecklistStorageKey,
  isStoredFlagComplete,
  onboardingCompleteStorageValue,
} from "@/src/features/onboarding/onboardingStorage";
import { getSetupChecklistItems, isSetupChecklistComplete } from "@/src/features/onboarding/setupChecklist";

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
