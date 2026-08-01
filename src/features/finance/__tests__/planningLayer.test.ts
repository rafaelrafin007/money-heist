import { describe, expect, it } from "vitest";

import { budgetFormToInsert, budgetRowToDomain, type BudgetRow } from "@/src/features/budgets/api/budgetMappers";
import {
  BUDGET_WARNING_THRESHOLD_PERCENT,
  calculateAccountBalances,
  calculateBudgetSummaries,
  calculateDailyRemainingBudgetAllowance,
  calculateSavingsGoalProgress,
} from "@/src/features/finance/calculations";
import { getCalendarMonthRange } from "@/src/features/finance/dates";
import type { Account, Category, FinanceDataset, SavingsGoal, Transaction } from "@/src/features/finance/types";
import {
  monthlyFinancePlanFormToUpsert,
  monthlyFinancePlanRowToDomain,
  type MonthlyFinancePlanRow,
} from "@/src/features/planning/api/monthlyFinancePlanMappers";
import { calculateRealPotentialSavings } from "@/src/features/planning/potentialSavings";
import {
  savingsGoalFormToInsert,
  savingsGoalRowToDomain,
  type SavingsGoalRow,
} from "@/src/features/savings/api/savingsGoalMappers";

const userId = "00000000-0000-4000-8000-000000000001";
const bankId = "00000000-0000-4000-8000-000000000002";
const savingsId = "00000000-0000-4000-8000-000000000003";
const investmentId = "00000000-0000-4000-8000-000000000004";
const foodId = "00000000-0000-4000-8000-000000000005";
const salaryId = "00000000-0000-4000-8000-000000000006";
const month = getCalendarMonthRange("2026-07-01");
const referenceDate = new Date("2026-07-15T12:00:00.000Z");

const accounts: Account[] = [
  { id: bankId, name: "Bank", type: "bank", currency: "BDT", openingBalanceMinor: 100000, isSavings: false, isArchived: false, createdAt: "2026-07-01T00:00:00Z" },
  { id: savingsId, name: "Savings", type: "savings", currency: "BDT", openingBalanceMinor: 10000, isSavings: true, isArchived: false, createdAt: "2026-07-01T00:00:00Z" },
  { id: investmentId, name: "Investment", type: "investment", currency: "BDT", openingBalanceMinor: 500000, isSavings: false, isArchived: false, createdAt: "2026-07-01T00:00:00Z" },
];

const categories: Category[] = [
  { id: foodId, name: "Food", kind: "expense", isArchived: false },
  { id: salaryId, name: "Salary", kind: "income", isArchived: false },
];

const transactions: Transaction[] = [
  { id: "tx-income", type: "income", accountId: bankId, categoryId: salaryId, amountMinor: 50000, currency: "BDT", occurredAt: "2026-07-04", status: "active", createdAt: "2026-07-04T00:00:00Z", updatedAt: "2026-07-04T00:00:00Z" },
  { id: "tx-food", type: "expense", accountId: bankId, categoryId: foodId, amountMinor: 30000, currency: "BDT", occurredAt: "2026-07-05", status: "active", createdAt: "2026-07-05T00:00:00Z", updatedAt: "2026-07-05T00:00:00Z" },
  { id: "tx-transfer-in", type: "transfer", accountId: bankId, destinationAccountId: savingsId, amountMinor: 20000, currency: "BDT", occurredAt: "2026-07-06", status: "active", createdAt: "2026-07-06T00:00:00Z", updatedAt: "2026-07-06T00:00:00Z" },
  { id: "tx-transfer-out", type: "transfer", accountId: savingsId, destinationAccountId: bankId, amountMinor: 5000, currency: "BDT", occurredAt: "2026-07-07", status: "active", createdAt: "2026-07-07T00:00:00Z", updatedAt: "2026-07-07T00:00:00Z" },
  { id: "tx-cancelled", type: "expense", accountId: bankId, categoryId: foodId, amountMinor: 999999, currency: "BDT", occurredAt: "2026-07-08", status: "cancelled", createdAt: "2026-07-08T00:00:00Z", updatedAt: "2026-07-08T00:00:00Z" },
  { id: "tx-out-period", type: "expense", accountId: bankId, categoryId: foodId, amountMinor: 999999, currency: "BDT", occurredAt: "2026-08-01", status: "active", createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z" },
];

describe("budget planning layer", () => {
  it("maps and validates budget rows and forms", () => {
    const row: BudgetRow = {
      id: "00000000-0000-4000-8000-000000000007",
      user_id: userId,
      category_id: foodId,
      period_start: month.start,
      period_end: month.end,
      limit_minor: 40000,
      currency_code: "BDT",
      status: "active",
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
    };

    expect(budgetRowToDomain(row)).toMatchObject({ limitMinor: 40000, status: "active" });
    expect(() => budgetRowToDomain({ ...row, period_end: "2026-06-30" })).toThrow();
    expect(() => budgetRowToDomain({ ...row, limit_minor: 0 })).toThrow(/greater than zero/);
    expect(() => budgetRowToDomain({ ...row, status: "deleted" })).toThrow(/Invalid budget status/);
    expect(() => budgetRowToDomain({ ...row, limit_minor: Number.MAX_SAFE_INTEGER + 1 })).toThrow(/safe integer/);
    expect(budgetFormToInsert({ categoryId: foodId, monthStart: month.start, limit: "1,250.75", currency: "BDT" }, userId, categories).limit_minor).toBe(125075);
    expect(() => budgetFormToInsert({ categoryId: salaryId, monthStart: month.start, limit: "10", currency: "BDT" }, userId, categories)).toThrow(/expense category/);
  });

  it("calculates matching budget spending, remaining, status and daily allowance", () => {
    const dataset = baseDataset(40000);
    const [summary] = calculateBudgetSummaries(dataset);

    expect(BUDGET_WARNING_THRESHOLD_PERCENT).toBe(75);
    expect(summary.spentMinor).toBe(30000);
    expect(summary.remainingMinor).toBe(10000);
    expect(summary.overspentMinor).toBe(0);
    expect(summary.utilizationPercent).toBe(75);
    expect(summary.status).toBe("warning");
    expect(calculateDailyRemainingBudgetAllowance([summary], month, referenceDate)).toBe(Math.floor(10000 / 17));

    const [overspent] = calculateBudgetSummaries(baseDataset(20000));
    expect(overspent.status).toBe("exceeded");
    expect(overspent.overspentMinor).toBe(10000);
  });
});

describe("savings goals and potential savings", () => {
  it("maps savings goals and validates linked savings accounts", () => {
    const row: SavingsGoalRow = {
      id: "00000000-0000-4000-8000-000000000008",
      user_id: userId,
      name: "Emergency fund",
      target_minor: 100000,
      currency_code: "BDT",
      current_amount_minor: 0,
      target_date: "2026-12-31",
      status: "active",
      linked_account_id: savingsId,
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
    };

    expect(savingsGoalRowToDomain(row)).toMatchObject({ linkedAccountId: savingsId, status: "active" });
    expect(() => savingsGoalRowToDomain({ ...row, target_minor: 0 })).toThrow(/greater than zero/);
    expect(savingsGoalFormToInsert({ name: "Laptop", target: "50.01", currency: "BDT", linkedAccountId: savingsId }, userId, accounts, []).target_minor).toBe(5001);
    expect(() => savingsGoalFormToInsert({ name: "Bad", target: "10", currency: "BDT", linkedAccountId: bankId }, userId, accounts, [])).toThrow(/savings/);
    expect(() => savingsGoalFormToInsert({ name: "Duplicate", target: "10", currency: "BDT", linkedAccountId: savingsId }, userId, accounts, [{ id: "goal-existing", name: "Existing", targetMinor: 1000, currency: "BDT", linkedAccountId: savingsId, status: "paused" }])).toThrow(/already linked/);
  });

  it("derives goal progress from linked account balances and transfer movement", () => {
    const goal: SavingsGoal = { id: "goal", name: "Emergency", targetMinor: 50000, currency: "BDT", linkedAccountId: savingsId, status: "active", targetDate: "2026-07-31" };
    const dataset = { ...baseDataset(40000), savingsGoals: [goal] };
    const [progress] = calculateSavingsGoalProgress(dataset, referenceDate);
    const balances = calculateAccountBalances(dataset);

    expect(balances.find((balance) => balance.account.id === savingsId)?.balanceMinor).toBe(25000);
    expect(progress.currentAmountMinor).toBe(25000);
    expect(progress.progressPercent).toBe(50);
    expect(progress.requiredMonthlyContributionMinor).toBeGreaterThan(0);
  });

  it("maps monthly plans and calculates potential savings with missing-plan and clamp behavior", () => {
    const row: MonthlyFinancePlanRow = {
      id: "00000000-0000-4000-8000-000000000009",
      user_id: userId,
      month_start: month.start,
      currency_code: "BDT",
      expected_remaining_income_minor: 20000,
      upcoming_fixed_expenses_minor: 10000,
      debt_obligations_minor: 5000,
      safety_buffer_minor: 10000,
      notes: null,
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
    };
    const plan = monthlyFinancePlanRowToDomain(row);

    expect(monthlyFinancePlanFormToUpsert({ monthStart: month.start, currency: "BDT", expectedRemainingIncome: "10.50", upcomingFixedExpenses: "0", debtObligations: "0", safetyBuffer: "0" }, userId).expected_remaining_income_minor).toBe(1050);
    expect(() => monthlyFinancePlanRowToDomain({ ...row, month_start: "2026-07-02" })).toThrow(/first-day/);
    expect(() => monthlyFinancePlanRowToDomain({ ...row, safety_buffer_minor: -1 })).toThrow(/negative/);

    const incomplete = calculateRealPotentialSavings({ accounts, categories, transactions, budgets: baseDataset(40000).budgets, monthlyPlan: null, currency: "BDT", range: month, referenceDate });
    expect(incomplete.status).toBe("incomplete");

    const complete = calculateRealPotentialSavings({ accounts, categories, transactions, budgets: baseDataset(40000).budgets, monthlyPlan: plan, currency: "BDT", range: month, referenceDate });
    expect(complete.breakdown.availableNonSavingsLiquidCashMinor).toBe(105000);
    expect(complete.breakdown.remainingVariableBudgetMinor).toBe(10000);
    expect(complete.amountMinor).toBe(90000);

    const clamped = calculateRealPotentialSavings({ accounts, categories, transactions, budgets: baseDataset(40000).budgets, monthlyPlan: { ...plan, safetyBufferMinor: 9999999 }, currency: "BDT", range: month, referenceDate });
    expect(clamped.amountMinor).toBe(0);
  });
});

function baseDataset(limitMinor: number): FinanceDataset {
  return {
    currency: "BDT",
    accounts,
    categories,
    transactions,
    budgets: [{ id: "budget-food", categoryId: foodId, periodStart: month.start, periodEnd: month.end, limitMinor, currency: "BDT", status: "active" }],
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
