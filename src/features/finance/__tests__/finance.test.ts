import { describe, expect, it } from "vitest";

import {
  calculateAccountBalances,
  calculateActualSavingsContribution,
  calculateBudgetSummaries,
  calculateExpenseTotal,
  calculateIncomeTotal,
  calculateNetWorth,
  calculatePotentialSavings,
  calculateSavingsGoalProgress,
} from "../calculations";
import { parseMoneyInputToMinor } from "../money";
import type { Account, Category, FinanceDataset, Transaction } from "../types";

const range = { start: "2026-07-01", end: "2026-07-31" };
const currency = "BDT";

const accounts: Account[] = [
  {
    id: "bank",
    name: "Bank",
    type: "bank",
    currency,
    openingBalanceMinor: 100000,
    isSavings: false,
    isArchived: false,
    createdAt: "2026-07-01T00:00:00",
  },
  {
    id: "cash",
    name: "Cash",
    type: "cash",
    currency,
    openingBalanceMinor: 50000,
    isSavings: false,
    isArchived: false,
    createdAt: "2026-07-01T00:00:00",
  },
  {
    id: "savings",
    name: "Savings",
    type: "savings",
    currency,
    openingBalanceMinor: 200000,
    isSavings: true,
    isArchived: false,
    createdAt: "2026-07-01T00:00:00",
  },
  {
    id: "savings-two",
    name: "Second savings",
    type: "savings",
    currency,
    openingBalanceMinor: 100000,
    isSavings: true,
    isArchived: false,
    createdAt: "2026-07-01T00:00:00",
  },
  {
    id: "card",
    name: "Credit card",
    type: "credit_card",
    currency,
    openingBalanceMinor: 30000,
    isSavings: false,
    isArchived: false,
    createdAt: "2026-07-01T00:00:00",
  },
];

const categories: Category[] = [
  { id: "salary", name: "Salary", kind: "income" },
  { id: "food", name: "Food", kind: "expense" },
  { id: "transport", name: "Transport", kind: "expense" },
];

function baseDataset(transactions: Transaction[] = []): FinanceDataset {
  return {
    currency,
    accounts,
    categories,
    transactions,
    budgets: [
      {
        id: "food-budget",
        categoryId: "food",
        periodStart: range.start,
        periodEnd: range.end,
        limitMinor: 50000,
        currency,
      },
    ],
    savingsGoals: [
      {
        id: "goal-active",
        name: "Emergency",
        targetMinor: 300000,
        currency,
        currentAmountMinor: 150000,
        targetDate: "2026-10-31",
        status: "active",
      },
      {
        id: "goal-complete",
        name: "Done",
        targetMinor: 100000,
        currency,
        currentAmountMinor: 100000,
        targetDate: "2026-06-01",
        status: "completed",
      },
      {
        id: "goal-overdue",
        name: "Late",
        targetMinor: 100000,
        currency,
        currentAmountMinor: 20000,
        targetDate: "2026-06-01",
        status: "active",
      },
    ],
    forecast: {
      currency,
      availableLiquidCashMinor: 0,
      expectedRemainingIncomeMinor: 0,
      upcomingFixedExpensesMinor: 1000,
      remainingVariableBudgetMinor: 0,
      debtObligationsMinor: 0,
      safetyBufferMinor: 0,
    },
  };
}

function tx(overrides: Transaction): Transaction {
  return overrides;
}

describe("money utilities", () => {
  it("parses decimal money strings into exact minor units", () => {
    expect(parseMoneyInputToMinor("100")).toBe(10000);
    expect(parseMoneyInputToMinor("100.5")).toBe(10050);
    expect(parseMoneyInputToMinor("100.50")).toBe(10050);
    expect(parseMoneyInputToMinor("1,250.75")).toBe(125075);
    expect(parseMoneyInputToMinor("0.01")).toBe(1);
    expect(parseMoneyInputToMinor("-10.25", { allowNegative: true })).toBe(-1025);
  });

  it("rejects invalid monetary input", () => {
    for (const input of ["", "abc", "10.999", "--10", "1.2.3"]) {
      expect(() => parseMoneyInputToMinor(input)).toThrow();
    }
  });
});

describe("accounting calculations", () => {
  it("income increases account balance and expense decreases account balance", () => {
    const dataset = baseDataset([
      tx({
        id: "income",
        type: "income",
        amountMinor: 25000,
        currency,
        accountId: "bank",
        categoryId: "salary",
        occurredAt: "2026-07-05",
        status: "active",
        createdAt: "2026-07-05T00:00:00",
        updatedAt: "2026-07-05T00:00:00",
      }),
      tx({
        id: "expense",
        type: "expense",
        amountMinor: 10000,
        currency,
        accountId: "bank",
        categoryId: "food",
        occurredAt: "2026-07-06",
        status: "active",
        createdAt: "2026-07-06T00:00:00",
        updatedAt: "2026-07-06T00:00:00",
      }),
    ]);

    const bank = calculateAccountBalances(dataset).find(({ account }) => account.id === "bank");
    expect(bank?.balanceMinor).toBe(115000);
  });

  it("transfer decreases one account and increases another", () => {
    const dataset = baseDataset([
      tx({
        id: "transfer",
        type: "transfer",
        amountMinor: 40000,
        currency,
        accountId: "bank",
        destinationAccountId: "cash",
        occurredAt: "2026-07-06",
        status: "active",
        createdAt: "2026-07-06T00:00:00",
        updatedAt: "2026-07-06T00:00:00",
      }),
    ]);

    const balances = calculateAccountBalances(dataset);
    expect(balances.find(({ account }) => account.id === "bank")?.balanceMinor).toBe(60000);
    expect(balances.find(({ account }) => account.id === "cash")?.balanceMinor).toBe(90000);
  });

  it("transfer is excluded from income", () => {
    const dataset = baseDataset([
      tx({
        id: "transfer",
        type: "transfer",
        amountMinor: 40000,
        currency,
        accountId: "bank",
        destinationAccountId: "cash",
        occurredAt: "2026-07-06",
        status: "active",
        createdAt: "2026-07-06T00:00:00",
        updatedAt: "2026-07-06T00:00:00",
      }),
    ]);

    expect(calculateIncomeTotal(dataset, range)).toBe(0);
  });

  it("transfer is excluded from expenses", () => {
    const dataset = baseDataset([
      tx({
        id: "transfer",
        type: "transfer",
        amountMinor: 40000,
        currency,
        accountId: "bank",
        destinationAccountId: "cash",
        occurredAt: "2026-07-06",
        status: "active",
        createdAt: "2026-07-06T00:00:00",
        updatedAt: "2026-07-06T00:00:00",
      }),
    ]);

    expect(calculateExpenseTotal(dataset, range)).toBe(0);
  });

  it("opening balance is excluded from income", () => {
    expect(calculateIncomeTotal(baseDataset(), range)).toBe(0);
  });

  it("calculates savings contribution from transfer direction only", () => {
    const dataset = baseDataset([
      tx({
        id: "to-savings",
        type: "transfer",
        amountMinor: 50000,
        currency,
        accountId: "bank",
        destinationAccountId: "savings",
        occurredAt: "2026-07-10",
        status: "active",
        createdAt: "2026-07-10T00:00:00",
        updatedAt: "2026-07-10T00:00:00",
      }),
      tx({
        id: "from-savings",
        type: "transfer",
        amountMinor: 20000,
        currency,
        accountId: "savings",
        destinationAccountId: "bank",
        occurredAt: "2026-07-11",
        status: "active",
        createdAt: "2026-07-11T00:00:00",
        updatedAt: "2026-07-11T00:00:00",
      }),
      tx({
        id: "savings-to-savings",
        type: "transfer",
        amountMinor: 10000,
        currency,
        accountId: "savings",
        destinationAccountId: "savings-two",
        occurredAt: "2026-07-12",
        status: "active",
        createdAt: "2026-07-12T00:00:00",
        updatedAt: "2026-07-12T00:00:00",
      }),
      tx({
        id: "direct-savings-income",
        type: "income",
        amountMinor: 10000,
        currency,
        accountId: "savings",
        categoryId: "salary",
        occurredAt: "2026-07-13",
        status: "active",
        createdAt: "2026-07-13T00:00:00",
        updatedAt: "2026-07-13T00:00:00",
      }),
    ]);

    expect(calculateActualSavingsContribution(dataset, range)).toBe(30000);
  });

  it("clamps potential savings to zero", () => {
    const result = calculatePotentialSavings(baseDataset().forecast);
    expect(result.amountMinor).toBe(0);
  });

  it("budget calculations include only matching active in-period expense transactions", () => {
    const dataset = baseDataset([
      tx({
        id: "food",
        type: "expense",
        amountMinor: 20000,
        currency,
        accountId: "cash",
        categoryId: "food",
        occurredAt: "2026-07-05",
        status: "active",
        createdAt: "2026-07-05T00:00:00",
        updatedAt: "2026-07-05T00:00:00",
      }),
      tx({
        id: "transport",
        type: "expense",
        amountMinor: 20000,
        currency,
        accountId: "cash",
        categoryId: "transport",
        occurredAt: "2026-07-05",
        status: "active",
        createdAt: "2026-07-05T00:00:00",
        updatedAt: "2026-07-05T00:00:00",
      }),
      tx({
        id: "food-out-of-period",
        type: "expense",
        amountMinor: 20000,
        currency,
        accountId: "cash",
        categoryId: "food",
        occurredAt: "2026-06-30",
        status: "active",
        createdAt: "2026-06-30T00:00:00",
        updatedAt: "2026-06-30T00:00:00",
      }),
      tx({
        id: "food-inactive",
        type: "expense",
        amountMinor: 20000,
        currency,
        accountId: "cash",
        categoryId: "food",
        occurredAt: "2026-07-06",
        status: "inactive",
        createdAt: "2026-07-06T00:00:00",
        updatedAt: "2026-07-06T00:00:00",
      }),
    ]);

    expect(calculateBudgetSummaries(dataset)[0]?.spentMinor).toBe(20000);
  });

  it("out-of-period transactions are excluded from period totals", () => {
    const dataset = baseDataset([
      tx({
        id: "income-out-of-period",
        type: "income",
        amountMinor: 20000,
        currency,
        accountId: "bank",
        categoryId: "salary",
        occurredAt: "2026-06-30",
        status: "active",
        createdAt: "2026-06-30T00:00:00",
        updatedAt: "2026-06-30T00:00:00",
      }),
      tx({
        id: "expense-out-of-period",
        type: "expense",
        amountMinor: 10000,
        currency,
        accountId: "cash",
        categoryId: "food",
        occurredAt: "2026-08-01",
        status: "active",
        createdAt: "2026-08-01T00:00:00",
        updatedAt: "2026-08-01T00:00:00",
      }),
    ]);

    expect(calculateIncomeTotal(dataset, range)).toBe(0);
    expect(calculateExpenseTotal(dataset, range)).toBe(0);
  });

  it("inactive transactions are excluded from balances and totals", () => {
    const dataset = baseDataset([
      tx({
        id: "inactive-income",
        type: "income",
        amountMinor: 50000,
        currency,
        accountId: "bank",
        categoryId: "salary",
        occurredAt: "2026-07-05",
        status: "inactive",
        createdAt: "2026-07-05T00:00:00",
        updatedAt: "2026-07-05T00:00:00",
      }),
    ]);

    expect(calculateIncomeTotal(dataset, range)).toBe(0);
    expect(calculateAccountBalances(dataset).find(({ account }) => account.id === "bank")?.balanceMinor).toBe(100000);
  });

  it("net worth subtracts liability balances", () => {
    const dataset = baseDataset([
      tx({
        id: "card-expense",
        type: "expense",
        amountMinor: 20000,
        currency,
        accountId: "card",
        categoryId: "food",
        occurredAt: "2026-07-05",
        status: "active",
        createdAt: "2026-07-05T00:00:00",
        updatedAt: "2026-07-05T00:00:00",
      }),
    ]);

    expect(calculateNetWorth(dataset)).toBe(400000);
  });

  it("throws on currency mismatches", () => {
    const dataset = baseDataset([
      tx({
        id: "wrong-currency",
        type: "income",
        amountMinor: 1000,
        currency: "USD",
        accountId: "bank",
        categoryId: "salary",
        occurredAt: "2026-07-05",
        status: "active",
        createdAt: "2026-07-05T00:00:00",
        updatedAt: "2026-07-05T00:00:00",
      }),
    ]);

    expect(() => calculateAccountBalances(dataset)).toThrow(/currency mismatch/i);
  });

  it("throws on invalid same-account transfers", () => {
    const dataset = baseDataset([
      tx({
        id: "same-account-transfer",
        type: "transfer",
        amountMinor: 1000,
        currency,
        accountId: "bank",
        destinationAccountId: "bank",
        occurredAt: "2026-07-05",
        status: "active",
        createdAt: "2026-07-05T00:00:00",
        updatedAt: "2026-07-05T00:00:00",
      }),
    ]);

    expect(() => calculateAccountBalances(dataset)).toThrow(/same account/i);
  });

  it("throws on non-positive transaction amounts", () => {
    const dataset = baseDataset([
      tx({
        id: "zero-income",
        type: "income",
        amountMinor: 0,
        currency,
        accountId: "bank",
        categoryId: "salary",
        occurredAt: "2026-07-05",
        status: "active",
        createdAt: "2026-07-05T00:00:00",
        updatedAt: "2026-07-05T00:00:00",
      }),
    ]);

    expect(() => calculateAccountBalances(dataset)).toThrow(/greater than zero/i);
  });

  it("throws on missing account and category references", () => {
    const missingAccountDataset = baseDataset([
      tx({
        id: "missing-account",
        type: "income",
        amountMinor: 1000,
        currency,
        accountId: "missing",
        categoryId: "salary",
        occurredAt: "2026-07-05",
        status: "active",
        createdAt: "2026-07-05T00:00:00",
        updatedAt: "2026-07-05T00:00:00",
      }),
    ]);
    const missingCategoryDataset = baseDataset([
      tx({
        id: "missing-category",
        type: "expense",
        amountMinor: 1000,
        currency,
        accountId: "bank",
        categoryId: "missing",
        occurredAt: "2026-07-05",
        status: "active",
        createdAt: "2026-07-05T00:00:00",
        updatedAt: "2026-07-05T00:00:00",
      }),
    ]);

    expect(() => calculateAccountBalances(missingAccountDataset)).toThrow(/missing account/i);
    expect(() => calculateAccountBalances(missingCategoryDataset)).toThrow(/missing category/i);
  });

  it("handles completed and overdue savings goals", () => {
    const goals = calculateSavingsGoalProgress(baseDataset(), new Date("2026-07-31T00:00:00"));
    expect(goals.find(({ goal }) => goal.id === "goal-complete")?.isAchieved).toBe(true);
    expect(goals.find(({ goal }) => goal.id === "goal-overdue")?.isOverdue).toBe(true);
  });
});
