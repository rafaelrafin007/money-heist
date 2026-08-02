import { describe, expect, it } from "vitest";

import type { Account, Budget, Category, FinanceDataset, MonthlyFinancePlan, Transaction } from "@/src/features/finance/types";
import {
  getOnboardingStorageKey,
  getSetupChecklistStorageKey,
  isStoredFlagComplete,
} from "@/src/features/onboarding/onboardingStorage";
import { getSetupChecklistItems, isSetupChecklistComplete } from "@/src/features/onboarding/setupChecklist";

describe("onboarding storage helpers", () => {
  it("uses user-scoped storage keys and explicit completion flags", () => {
    expect(getOnboardingStorageKey("user-a")).not.toBe(getOnboardingStorageKey("user-b"));
    expect(getSetupChecklistStorageKey("user-a")).not.toBe(getSetupChecklistStorageKey("user-b"));
    expect(isStoredFlagComplete("true")).toBe(true);
    expect(isStoredFlagComplete("false")).toBe(false);
    expect(isStoredFlagComplete(null)).toBe(false);
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
