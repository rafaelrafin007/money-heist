import { describe, expect, it } from "vitest";

import { transactionFormToInsert } from "@/src/features/finance/api/databaseMappers";
import { getCalendarMonthRange } from "@/src/features/finance/dates";
import type { Account, Category, FinanceDataset, Transaction } from "@/src/features/finance/types";
import { getQuickEntryHref, sanitizeTransactionRoutePreset } from "@/src/features/transactions/quickEntry";
import {
  getThisMonthTransactionSummary,
  getTodayTransactionSummary,
  groupTransactionsByCalendarDate,
} from "@/src/features/transactions/transactionSelectors";

const userId = "00000000-0000-4000-8000-000000000001";
const bankId = "00000000-0000-4000-8000-000000000002";
const cashId = "00000000-0000-4000-8000-000000000003";
const savingsId = "00000000-0000-4000-8000-000000000004";
const archivedId = "00000000-0000-4000-8000-000000000005";
const incomeCategoryId = "00000000-0000-4000-8000-000000000006";
const expenseCategoryId = "00000000-0000-4000-8000-000000000007";
const referenceDate = new Date("2026-08-01T12:00:00.000Z");

const accounts: Account[] = [
  { id: bankId, name: "Bank", type: "bank", currency: "BDT", openingBalanceMinor: 0, isSavings: false, isArchived: false, createdAt: "2026-08-01T00:00:00Z" },
  { id: cashId, name: "Cash", type: "cash", currency: "BDT", openingBalanceMinor: 0, isSavings: false, isArchived: false, createdAt: "2026-08-01T00:00:00Z" },
  { id: savingsId, name: "Savings", type: "savings", currency: "BDT", openingBalanceMinor: 0, isSavings: true, isArchived: false, createdAt: "2026-08-01T00:00:00Z" },
  { id: archivedId, name: "Archived", type: "bank", currency: "BDT", openingBalanceMinor: 0, isSavings: false, isArchived: true, createdAt: "2026-08-01T00:00:00Z" },
];

const categories: Category[] = [
  { id: incomeCategoryId, name: "Salary", kind: "income", isArchived: false },
  { id: expenseCategoryId, name: "Food", kind: "expense", isArchived: false },
];

describe("quick entry routes and presets", () => {
  it("builds quick-action routes for income, expense, save and transfer", () => {
    expect(getQuickEntryHref("income", referenceDate)).toBe("/transactions/new?type=income&date=2026-08-01");
    expect(getQuickEntryHref("expense", referenceDate)).toBe("/transactions/new?type=expense&date=2026-08-01");
    expect(getQuickEntryHref("save", referenceDate)).toBe("/transactions/new?type=transfer&mode=savings&date=2026-08-01");
    expect(getQuickEntryHref("transfer", referenceDate)).toBe("/transactions/new?type=transfer&date=2026-08-01");
  });

  it("sanitizes transaction form presets and ignores invalid route account ids", () => {
    expect(sanitizeTransactionRoutePreset({ type: "income", accountId: bankId, date: "2026-08-01" }, accounts, referenceDate)).toMatchObject({
      type: "income",
      accountId: bankId,
      occurredAt: "2026-08-01",
    });
    expect(sanitizeTransactionRoutePreset({ type: "expense", accountId: archivedId }, accounts, referenceDate).accountId).toBe("");
    expect(sanitizeTransactionRoutePreset({ type: "transfer", sourceAccountId: bankId, destinationAccountId: savingsId, mode: "savings" }, accounts, referenceDate)).toMatchObject({
      type: "transfer",
      mode: "savings",
      accountId: bankId,
      destinationAccountId: savingsId,
    });
    expect(sanitizeTransactionRoutePreset({ type: "bad", date: "not-a-date" }, accounts, referenceDate)).toMatchObject({
      type: "expense",
      occurredAt: "2026-08-01",
    });
  });

  it("preserves transaction form validation and exact amount parsing", () => {
    expect(transactionFormToInsert({ type: "income", amount: "1,250.75", accountId: bankId, categoryId: incomeCategoryId, occurredAt: "2026-08-01" }, userId, accounts, categories).amount_minor).toBe(125075);
    expect(transactionFormToInsert({ type: "expense", amount: "10.50", accountId: bankId, categoryId: expenseCategoryId, occurredAt: "2026-08-01" }, userId, accounts, categories).amount_minor).toBe(1050);
    expect(transactionFormToInsert({ type: "transfer", amount: "99.99", accountId: bankId, destinationAccountId: savingsId, occurredAt: "2026-08-01" }, userId, accounts, categories).amount_minor).toBe(9999);
    expect(() => transactionFormToInsert({ type: "expense", amount: "10", accountId: archivedId, categoryId: expenseCategoryId, occurredAt: "2026-08-01" }, userId, accounts, categories)).toThrow(/Archived accounts/);
    expect(() => transactionFormToInsert({ type: "income", amount: "10", accountId: bankId, categoryId: expenseCategoryId, occurredAt: "2026-08-01" }, userId, accounts, categories)).toThrow(/income category/);
    expect(() => transactionFormToInsert({ type: "transfer", amount: "10", accountId: bankId, destinationAccountId: cashId, occurredAt: "2026-08-01" }, userId, [accounts[0], { ...accounts[1], currency: "USD" }], categories)).toThrow(/different currencies/);
  });
});

describe("daily and monthly transaction selectors", () => {
  it("calculates today and this-month summaries with transfer and cancellation rules", () => {
    const dataset = baseDataset();
    const today = getTodayTransactionSummary(dataset, referenceDate);
    const month = getThisMonthTransactionSummary(dataset, referenceDate);

    expect(today.incomeMinor).toBe(100000);
    expect(today.expensesMinor).toBe(25000);
    expect(today.netCashFlowMinor).toBe(75000);
    expect(today.savedMinor).toBe(15000);
    expect(today.activeTransactionCount).toBe(4);
    expect(month.incomeMinor).toBe(110000);
    expect(month.expensesMinor).toBe(25000);
    expect(month.savedMinor).toBe(15000);
  });

  it("excludes yesterday, cancelled records and month-boundary records from the selected summary", () => {
    const today = getTodayTransactionSummary(baseDataset(), referenceDate);
    const julySummary = getThisMonthTransactionSummary(baseDataset(), new Date("2026-07-31T12:00:00.000Z"));

    expect(today.incomeMinor).toBe(100000);
    expect(julySummary.incomeMinor).toBe(999);
    expect(julySummary.expensesMinor).toBe(5000);
  });

  it("groups visible transactions by calendar date with daily summaries", () => {
    const dataset = baseDataset();
    const groups = groupTransactionsByCalendarDate(dataset, dataset.transactions.filter((transaction) => transaction.status === "active"), referenceDate);

    const todayGroup = groups.find((group) => group.label === "Today");
    const yesterdayGroup = groups.find((group) => group.label === "Yesterday");

    expect(todayGroup?.summary.incomeMinor).toBe(100000);
    expect(yesterdayGroup?.summary.expensesMinor).toBe(5000);
  });
});

function baseDataset(): FinanceDataset {
  const transactions: Transaction[] = [
    { id: "today-income", type: "income", accountId: bankId, categoryId: incomeCategoryId, amountMinor: 100000, currency: "BDT", occurredAt: "2026-08-01", status: "active", createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
    { id: "today-expense", type: "expense", accountId: bankId, categoryId: expenseCategoryId, amountMinor: 25000, currency: "BDT", occurredAt: "2026-08-01", status: "active", createdAt: "2026-08-01T10:00:00Z", updatedAt: "2026-08-01T10:00:00Z" },
    { id: "today-save", type: "transfer", accountId: bankId, destinationAccountId: savingsId, amountMinor: 15000, currency: "BDT", occurredAt: "2026-08-01", status: "active", createdAt: "2026-08-01T11:00:00Z", updatedAt: "2026-08-01T11:00:00Z" },
    { id: "today-transfer", type: "transfer", accountId: bankId, destinationAccountId: cashId, amountMinor: 3000, currency: "BDT", occurredAt: "2026-08-01", status: "active", createdAt: "2026-08-01T12:00:00Z", updatedAt: "2026-08-01T12:00:00Z" },
    { id: "cancelled", type: "expense", accountId: bankId, categoryId: expenseCategoryId, amountMinor: 999999, currency: "BDT", occurredAt: "2026-08-01", status: "cancelled", createdAt: "2026-08-01T13:00:00Z", updatedAt: "2026-08-01T13:00:00Z" },
    { id: "yesterday-expense", type: "expense", accountId: bankId, categoryId: expenseCategoryId, amountMinor: 5000, currency: "BDT", occurredAt: "2026-07-31", status: "active", createdAt: "2026-07-31T10:00:00Z", updatedAt: "2026-07-31T10:00:00Z" },
    { id: "july-income", type: "income", accountId: bankId, categoryId: incomeCategoryId, amountMinor: 999, currency: "BDT", occurredAt: "2026-07-31", status: "active", createdAt: "2026-07-31T08:00:00Z", updatedAt: "2026-07-31T08:00:00Z" },
    { id: "august-income", type: "income", accountId: bankId, categoryId: incomeCategoryId, amountMinor: 10000, currency: "BDT", occurredAt: "2026-08-15", status: "active", createdAt: "2026-08-15T08:00:00Z", updatedAt: "2026-08-15T08:00:00Z" },
  ];

  return {
    currency: "BDT",
    accounts,
    categories,
    transactions,
    budgets: [{ id: "budget", categoryId: expenseCategoryId, periodStart: getCalendarMonthRange("2026-08-01").start, periodEnd: getCalendarMonthRange("2026-08-01").end, limitMinor: 100000, currency: "BDT", status: "active" }],
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
