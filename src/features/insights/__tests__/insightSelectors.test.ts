import { describe, expect, it } from "vitest";

import { getCalendarMonthRange } from "@/src/features/finance/dates";
import type { Account, Budget, Category, FinanceDataset, SavingsGoal, Transaction } from "@/src/features/finance/types";
import {
  getBudgetHealthSummary,
  getCashFlowChartData,
  getExpenseCategoryChartData,
  getFinanceInsights,
  getRecentMonthStarts,
  getSavingsTrendData,
} from "@/src/features/insights/insightSelectors";

const referenceDate = new Date("2026-07-15T12:00:00.000Z");
const currency = "BDT";

const accounts: Account[] = [
  { id: "bank", name: "Bank", type: "bank", currency, openingBalanceMinor: 100000, isSavings: false, isArchived: false, createdAt: "2026-05-01T00:00:00Z" },
  { id: "cash", name: "Cash", type: "cash", currency, openingBalanceMinor: 25000, isSavings: false, isArchived: false, createdAt: "2026-05-01T00:00:00Z" },
  { id: "savings", name: "Savings", type: "savings", currency, openingBalanceMinor: 50000, isSavings: true, isArchived: false, createdAt: "2026-05-01T00:00:00Z" },
  { id: "usd-bank", name: "USD bank", type: "bank", currency: "USD", openingBalanceMinor: 0, isSavings: false, isArchived: false, createdAt: "2026-05-01T00:00:00Z" },
];

const categories: Category[] = [
  { id: "salary", name: "Salary", kind: "income" },
  { id: "food", name: "Food", kind: "expense" },
  { id: "transport", name: "Transport", kind: "expense" },
  { id: "shopping", name: "Shopping", kind: "expense" },
  { id: "bills", name: "Bills", kind: "expense" },
  { id: "health", name: "Healthcare", kind: "expense" },
  { id: "education", name: "Education", kind: "expense" },
  { id: "family", name: "Family", kind: "expense" },
];

const budgets: Budget[] = [
  { id: "budget-food", categoryId: "food", periodStart: "2026-07-01", periodEnd: "2026-07-31", limitMinor: 100000, currency, status: "active" },
  { id: "budget-transport", categoryId: "transport", periodStart: "2026-07-01", periodEnd: "2026-07-31", limitMinor: 35000, currency, status: "active" },
  { id: "budget-shopping", categoryId: "shopping", periodStart: "2026-07-01", periodEnd: "2026-07-31", limitMinor: 10000, currency, status: "active" },
];

const goals: SavingsGoal[] = [
  { id: "goal", name: "Emergency fund", targetMinor: 300000, currency, currentAmountMinor: 100000, targetDate: "2026-12-31", status: "active" },
];

describe("finance chart selectors", () => {
  it("builds a deterministic six-month range from the explicit reference date", () => {
    expect(getRecentMonthStarts(new Date("2026-07-15T12:00:00.000Z"), 6)).toEqual([
      "2026-02-01",
      "2026-03-01",
      "2026-04-01",
      "2026-05-01",
      "2026-06-01",
      "2026-07-01",
    ]);
  });

  it("groups monthly income and expenses while excluding transfers, cancelled records, missing months and other currencies", () => {
    const chart = getCashFlowChartData(baseDataset(), referenceDate, { months: 3 });

    expect(chart.map((month) => month.monthStart)).toEqual(["2026-05-01", "2026-06-01", "2026-07-01"]);
    expect(chart[0]).toMatchObject({ incomeMinor: 50000, expensesMinor: 30000 });
    expect(chart[1]).toMatchObject({ incomeMinor: 80000, expensesMinor: 20000 });
    expect(chart[2]).toMatchObject({ incomeMinor: 100000, expensesMinor: 122000 });
  });

  it("returns honest zeroes for months in range without records", () => {
    const chart = getCashFlowChartData({ ...baseDataset(), transactions: [] }, referenceDate, { months: 2 });

    expect(chart).toEqual([
      expect.objectContaining({ monthStart: "2026-06-01", incomeMinor: 0, expensesMinor: 0 }),
      expect.objectContaining({ monthStart: "2026-07-01", incomeMinor: 0, expensesMinor: 0 }),
    ]);
  });

  it("ranks expense categories and combines hidden categories under Other accurately", () => {
    const categories = getExpenseCategoryChartData(baseDataset(), referenceDate, { limit: 5 });

    expect(categories.map((item) => [item.categoryName, item.amountMinor])).toEqual([
      ["Food", 50000],
      ["Transport", 30000],
      ["Shopping", 20000],
      ["Bills", 10000],
      ["Healthcare", 5000],
      ["Other", 7000],
    ]);
    expect(categories.reduce((total, item) => total + item.amountMinor, 0)).toBe(122000);
  });

  it("calculates savings trend from transfers while excluding opening balances, cancelled transfers and normal transfers", () => {
    const trend = getSavingsTrendData(baseDataset(), referenceDate, { months: 3 });

    expect(trend.map((month) => [month.monthStart, month.savedMinor])).toEqual([
      ["2026-05-01", 0],
      ["2026-06-01", 10000],
      ["2026-07-01", 20000],
    ]);
  });

  it("keeps selected currencies separate", () => {
    const bdtChart = getCashFlowChartData(baseDataset(), referenceDate, { months: 1, currency: "BDT" });
    const usdChart = getCashFlowChartData(baseDataset(), referenceDate, { months: 1, currency: "USD" });

    expect(bdtChart[0].incomeMinor).toBe(100000);
    expect(usdChart[0].incomeMinor).toBe(999999);
  });
});

describe("finance insight selectors", () => {
  it("creates supported monthly insights with formatted user-facing amounts", () => {
    const insights = getFinanceInsights(baseDataset(), referenceDate, { potentialSavingsStatus: "incomplete" });
    const ids = insights.map((insight) => insight.id);

    expect(ids).toContain("largest-expense-category");
    expect(ids).toContain("income-change");
    expect(ids).toContain("expense-change");
    expect(ids).toContain("average-daily-expense");
    expect(ids).toContain("budget-near-limit");
    expect(ids).toContain("budget-exceeded");
    expect(ids).toContain("budget-spending-pace");
    expect(ids).toContain("net-savings-contribution");
    expect(ids).toContain("highest-spending-day");
    expect(ids).toContain("goal-largest-contribution");
    expect(ids).toContain("potential-savings-incomplete");
    expect(insights.map((insight) => insight.detail).join(" ")).not.toMatch(/minor units/i);
    expect(insights.find((insight) => insight.id === "budget-spending-pace")?.detail).toMatch(/Estimated/);
  });

  it("handles month-over-month decreases and no previous-month data without division by zero", () => {
    const decreaseDataset = {
      ...baseDataset(),
      transactions: [
        income("previous-income", "2026-06-10", 100000),
        income("current-income", "2026-07-10", 50000),
      ],
    };
    const noPreviousDataset = { ...baseDataset(), transactions: [income("current-income", "2026-07-10", 50000)] };

    expect(getFinanceInsights(decreaseDataset, referenceDate).find((insight) => insight.id === "income-change")?.title).toMatch(/decreased/);
    expect(getFinanceInsights(noPreviousDataset, referenceDate).some((insight) => insight.id === "income-change")).toBe(false);
  });

  it("returns a neutral no-data state when there are no supported observations", () => {
    const insights = getFinanceInsights({ ...emptyDataset(), accounts, categories }, referenceDate);

    expect(insights).toEqual([
      expect.objectContaining({ id: "no-data", tone: "default" }),
    ]);
  });

  it("summarizes budget health", () => {
    const health = getBudgetHealthSummary(baseDataset());

    expect(health.totalLimitMinor).toBe(145000);
    expect(health.totalSpentMinor).toBe(100000);
    expect(health.nearLimitCount).toBe(1);
    expect(health.exceededCount).toBe(1);
    expect(health.rankedBudgets[0]).toMatchObject({ categoryName: "Shopping", status: "exceeded" });
  });
});

function baseDataset(): FinanceDataset {
  return {
    ...emptyDataset(),
    accounts,
    categories,
    transactions: [
      income("may-income", "2026-05-05", 50000),
      expense("may-food", "2026-05-06", "food", 30000),
      income("jun-income", "2026-06-05", 80000),
      expense("jun-food", "2026-06-06", "food", 20000),
      transfer("jun-save", "2026-06-10", "bank", "savings", 10000),
      income("jul-income", "2026-07-05", 100000),
      expense("jul-food", "2026-07-06", "food", 50000),
      expense("jul-transport", "2026-07-07", "transport", 30000),
      expense("jul-shopping", "2026-07-08", "shopping", 20000),
      expense("jul-bills", "2026-07-09", "bills", 10000),
      expense("jul-health", "2026-07-10", "health", 5000),
      expense("jul-education", "2026-07-11", "education", 4000),
      expense("jul-family", "2026-07-12", "family", 3000),
      transfer("jul-save", "2026-07-13", "bank", "savings", 25000),
      transfer("jul-withdraw", "2026-07-14", "savings", "bank", 5000),
      transfer("jul-normal-transfer", "2026-07-14", "bank", "cash", 7000),
      { ...expense("jul-cancelled", "2026-07-15", "food", 999999), status: "cancelled" },
      income("usd-income", "2026-07-15", 999999, "USD", "usd-bank"),
    ],
    budgets,
    savingsGoals: goals,
  };
}

function emptyDataset(): FinanceDataset {
  return {
    currency,
    accounts: [],
    categories: [],
    transactions: [],
    budgets: [],
    savingsGoals: [],
    forecast: {
      currency,
      availableLiquidCashMinor: 0,
      expectedRemainingIncomeMinor: 0,
      upcomingFixedExpensesMinor: 0,
      remainingVariableBudgetMinor: 0,
      debtObligationsMinor: 0,
      safetyBufferMinor: 0,
    },
  };
}

function income(id: string, occurredAt: string, amountMinor: number, txCurrency = currency, accountId = "bank"): Transaction {
  return { id, type: "income", accountId, categoryId: "salary", amountMinor, currency: txCurrency, occurredAt, status: "active", createdAt: `${occurredAt}T09:00:00Z`, updatedAt: `${occurredAt}T09:00:00Z` };
}

function expense(id: string, occurredAt: string, categoryId: string, amountMinor: number): Transaction {
  return { id, type: "expense", accountId: "bank", categoryId, amountMinor, currency, occurredAt, status: "active", createdAt: `${occurredAt}T10:00:00Z`, updatedAt: `${occurredAt}T10:00:00Z` };
}

function transfer(id: string, occurredAt: string, accountId: string, destinationAccountId: string, amountMinor: number): Transaction {
  return { id, type: "transfer", accountId, destinationAccountId, amountMinor, currency, occurredAt, status: "active", createdAt: `${occurredAt}T11:00:00Z`, updatedAt: `${occurredAt}T11:00:00Z` };
}
