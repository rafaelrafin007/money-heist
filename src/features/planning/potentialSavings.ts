import {
  calculateAccountBalances,
  calculateBudgetSummaries,
  calculateDailyRemainingBudgetAllowance,
  calculatePotentialSavings,
  calculateTotalRemainingVariableBudget,
} from "@/src/features/finance/calculations";
import { toIsoDate, type DateRange } from "@/src/features/finance/dates";
import { assertSameCurrency, addMinor } from "@/src/features/finance/money";
import type {
  Account,
  Budget,
  Category,
  CurrencyCode,
  FinanceDataset,
  MonthlyFinancePlan,
  Transaction,
} from "@/src/features/finance/types";
import { isAssetAccount } from "@/src/features/finance/validation";

export type PotentialSavingsBreakdown = {
  availableNonSavingsLiquidCashMinor: number;
  expectedRemainingIncomeMinor: number;
  upcomingFixedExpensesMinor: number;
  remainingVariableBudgetMinor: number;
  debtObligationsMinor: number;
  safetyBufferMinor: number;
};

export type RealPotentialSavingsResult = {
  status: "complete" | "incomplete";
  currency: CurrencyCode;
  range: DateRange;
  calculatedAt: string;
  amountMinor: number;
  dailyBudgetAllowanceMinor: number;
  breakdown: PotentialSavingsBreakdown;
  warnings: string[];
};

export function calculateRealPotentialSavings(input: {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  monthlyPlan: MonthlyFinancePlan | null;
  currency: CurrencyCode;
  range: DateRange;
  referenceDate?: Date;
}): RealPotentialSavingsResult {
  const referenceDate = input.referenceDate ?? new Date();
  const referenceIsoDate = toIsoDate(referenceDate);
  const transactionsAsOfReferenceDate = input.transactions.filter((transaction) => transaction.occurredAt <= referenceIsoDate);
  const dataset: FinanceDataset = {
    currency: input.currency,
    accounts: input.accounts.filter((account) => account.currency === input.currency),
    categories: input.categories,
    transactions: input.transactions.filter((transaction) => transaction.currency === input.currency),
    budgets: input.budgets.filter((budget) => budget.currency === input.currency),
    savingsGoals: [],
    forecast: {
      currency: input.currency,
      availableLiquidCashMinor: 0,
      expectedRemainingIncomeMinor: 0,
      upcomingFixedExpensesMinor: 0,
      remainingVariableBudgetMinor: 0,
      debtObligationsMinor: 0,
      safetyBufferMinor: 0,
    },
  };
  const balanceDataset = {
    ...dataset,
    transactions: transactionsAsOfReferenceDate.filter((transaction) => transaction.currency === input.currency),
  };
  const summaries = calculateBudgetSummaries(dataset);
  const remainingVariableBudgetMinor = calculateTotalRemainingVariableBudget(summaries);
  const availableNonSavingsLiquidCashMinor = calculateAvailableNonSavingsLiquidCash(balanceDataset);
  const dailyBudgetAllowanceMinor = calculateDailyRemainingBudgetAllowance(summaries, input.range, referenceDate);

  if (!input.monthlyPlan) {
    return {
      status: "incomplete",
      currency: input.currency,
      range: input.range,
      calculatedAt: referenceDate.toISOString(),
      amountMinor: 0,
      dailyBudgetAllowanceMinor,
      breakdown: {
        availableNonSavingsLiquidCashMinor,
        expectedRemainingIncomeMinor: 0,
        upcomingFixedExpensesMinor: 0,
        remainingVariableBudgetMinor,
        debtObligationsMinor: 0,
        safetyBufferMinor: 0,
      },
      warnings: ["Complete your monthly planning assumptions to calculate potential savings."],
    };
  }

  assertSameCurrency(input.currency, input.monthlyPlan.currency, "Monthly plan");
  const potential = calculatePotentialSavings({
    currency: input.currency,
    availableLiquidCashMinor: availableNonSavingsLiquidCashMinor,
    expectedRemainingIncomeMinor: input.monthlyPlan.expectedRemainingIncomeMinor,
    upcomingFixedExpensesMinor: input.monthlyPlan.upcomingFixedExpensesMinor,
    remainingVariableBudgetMinor,
    debtObligationsMinor: input.monthlyPlan.debtObligationsMinor,
    safetyBufferMinor: input.monthlyPlan.safetyBufferMinor,
  });

  return {
    status: "complete",
    currency: input.currency,
    range: input.range,
    calculatedAt: referenceDate.toISOString(),
    amountMinor: potential.amountMinor,
    dailyBudgetAllowanceMinor,
    breakdown: {
      availableNonSavingsLiquidCashMinor,
      expectedRemainingIncomeMinor: input.monthlyPlan.expectedRemainingIncomeMinor,
      upcomingFixedExpensesMinor: input.monthlyPlan.upcomingFixedExpensesMinor,
      remainingVariableBudgetMinor,
      debtObligationsMinor: input.monthlyPlan.debtObligationsMinor,
      safetyBufferMinor: input.monthlyPlan.safetyBufferMinor,
    },
    warnings: [],
  };
}

export function calculateAvailableNonSavingsLiquidCash(dataset: FinanceDataset) {
  return calculateAccountBalances(dataset)
    .filter(({ account }) =>
      !account.isArchived &&
      !account.isSavings &&
      isAssetAccount(account) &&
      (account.type === "cash" || account.type === "bank" || account.type === "mobile_wallet"),
    )
    .reduce((total, { balanceMinor }) => addMinor(total, Math.max(0, balanceMinor)), 0);
}
