import { daysRemainingInPeriod, isIsoDateInRange, type DateRange } from "@/src/features/finance/dates";
import {
  addMinor,
  assertSameCurrency,
  assertSafeMinorUnits,
  subtractMinor,
} from "@/src/features/finance/money";
import {
  activeTransactionsInRange,
  isAssetAccount,
  isLiabilityAccount,
  validateFinanceDataset,
} from "@/src/features/finance/validation";
import type {
  Account,
  Budget,
  Category,
  FinanceDataset,
  PotentialSavingsForecastInput,
  SavingsGoal,
  Transaction,
} from "@/src/features/finance/types";

export type AccountBalance = {
  account: Account;
  balanceMinor: number;
};

export type BudgetSummary = {
  budget: Budget;
  category: Category;
  spentMinor: number;
  remainingMinor: number;
  utilizationPercent: number;
  isExceeded: boolean;
  overspentMinor: number;
  status: "safe" | "warning" | "exceeded";
};

export type SavingsGoalProgress = {
  goal: SavingsGoal;
  currentAmountMinor: number;
  remainingMinor: number;
  progressPercent: number;
  isAchieved: boolean;
  isOverdue: boolean;
  requiredMonthlyContributionMinor: number;
  requiredWeeklyContributionMinor: number;
};

export type PotentialSavingsResult = {
  currency: string;
  amountMinor: number;
  breakdown: PotentialSavingsForecastInput;
};

export const BUDGET_WARNING_THRESHOLD_PERCENT = 75;

export function calculateAccountBalances(dataset: FinanceDataset): AccountBalance[] {
  validateFinanceDataset(dataset);
  const balances = new Map<string, number>();
  const accountsById = new Map(dataset.accounts.map((account) => [account.id, account]));

  for (const account of dataset.accounts) {
    balances.set(account.id, account.openingBalanceMinor);
  }

  for (const transaction of dataset.transactions) {
    if (transaction.status !== "active") {
      continue;
    }

    const account = getRequiredAccount(accountsById, transaction.accountId);
    assertSameCurrency(account.currency, transaction.currency, `Transaction ${transaction.id}`);

    if (transaction.type === "income") {
      applyAccountDelta(balances, account, isLiabilityAccount(account) ? -transaction.amountMinor : transaction.amountMinor);
    }

    if (transaction.type === "expense") {
      applyAccountDelta(balances, account, isLiabilityAccount(account) ? transaction.amountMinor : -transaction.amountMinor);
    }

    if (transaction.type === "adjustment") {
      const direction = transaction.direction === "increase" ? 1 : -1;
      applyAccountDelta(balances, account, transaction.amountMinor * direction);
    }

    if (transaction.type === "transfer") {
      const destinationAccount = getRequiredAccount(accountsById, transaction.destinationAccountId);
      assertSameCurrency(account.currency, destinationAccount.currency, `Transaction ${transaction.id}`);
      applyAccountDelta(balances, account, isLiabilityAccount(account) ? transaction.amountMinor : -transaction.amountMinor);
      applyAccountDelta(
        balances,
        destinationAccount,
        isLiabilityAccount(destinationAccount) ? -transaction.amountMinor : transaction.amountMinor,
      );
    }
  }

  return dataset.accounts.map((account) => ({
    account,
    balanceMinor: balances.get(account.id) ?? account.openingBalanceMinor,
  }));
}

export function calculateIncomeTotal(dataset: FinanceDataset, range: DateRange) {
  validateFinanceDataset(dataset);
  return activeTransactionsInRange(dataset.transactions, range)
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => addMinor(total, transaction.amountMinor), 0);
}

export function calculateExpenseTotal(dataset: FinanceDataset, range: DateRange) {
  validateFinanceDataset(dataset);
  return activeTransactionsInRange(dataset.transactions, range)
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => addMinor(total, transaction.amountMinor), 0);
}

export function calculateNetCashFlow(dataset: FinanceDataset, range: DateRange) {
  return subtractMinor(calculateIncomeTotal(dataset, range), calculateExpenseTotal(dataset, range));
}

export function calculateActualSavingsContribution(dataset: FinanceDataset, range: DateRange) {
  validateFinanceDataset(dataset);
  const accountsById = new Map(dataset.accounts.map((account) => [account.id, account]));

  // This metric measures deliberate movement into or out of savings accounts.
  // Direct income deposited into savings and direct expenses paid from savings are tracked in balances,
  // but they are not counted as savings contributions.
  return activeTransactionsInRange(dataset.transactions, range)
    .filter((transaction) => transaction.type === "transfer")
    .reduce((total, transaction) => {
      if (transaction.type !== "transfer") {
        return total;
      }

      const source = getRequiredAccount(accountsById, transaction.accountId);
      const destination = getRequiredAccount(accountsById, transaction.destinationAccountId);

      if (!source.isSavings && destination.isSavings) {
        return addMinor(total, transaction.amountMinor);
      }

      if (source.isSavings && !destination.isSavings) {
        return subtractMinor(total, transaction.amountMinor);
      }

      return total;
    }, 0);
}

export function calculateTotalSavingsBalance(dataset: FinanceDataset) {
  return calculateAccountBalances(dataset)
    .filter(({ account }) => !account.isArchived && isAssetAccount(account) && account.isSavings)
    .reduce((total, { balanceMinor }) => addMinor(total, Math.max(0, balanceMinor)), 0);
}

export function calculateTotalAssets(dataset: FinanceDataset) {
  return calculateAccountBalances(dataset)
    .filter(({ account }) => !account.isArchived && isAssetAccount(account))
    .reduce((total, { balanceMinor }) => addMinor(total, Math.max(0, balanceMinor)), 0);
}

export function calculateTotalLiabilities(dataset: FinanceDataset) {
  return calculateAccountBalances(dataset)
    .filter(({ account }) => !account.isArchived && isLiabilityAccount(account))
    .reduce((total, { balanceMinor }) => addMinor(total, Math.max(0, balanceMinor)), 0);
}

export function calculateNetWorth(dataset: FinanceDataset) {
  return subtractMinor(calculateTotalAssets(dataset), calculateTotalLiabilities(dataset));
}

export function calculateBudgetSummaries(dataset: FinanceDataset): BudgetSummary[] {
  validateFinanceDataset(dataset);
  const categoriesById = new Map(dataset.categories.map((category) => [category.id, category]));

  return dataset.budgets
    .filter((budget) => budget.status !== "archived")
    .map((budget) => {
    const category = categoriesById.get(budget.categoryId);

    if (!category) {
      throw new Error(`Budget ${budget.id} references missing category ${budget.categoryId}.`);
    }

    const range = { start: budget.periodStart, end: budget.periodEnd };
    const spentMinor = activeTransactionsInRange(dataset.transactions, range)
      .filter(
        (transaction) =>
          transaction.type === "expense" &&
          transaction.categoryId === budget.categoryId &&
          transaction.currency === budget.currency,
      )
      .reduce((total, transaction) => addMinor(total, transaction.amountMinor), 0);
    const remainingMinor = subtractMinor(budget.limitMinor, spentMinor);
    const utilizationPercent = Math.round((spentMinor / budget.limitMinor) * 100);
    const isExceeded = spentMinor > budget.limitMinor;
    const overspentMinor = isExceeded ? subtractMinor(spentMinor, budget.limitMinor) : 0;
    const status = isExceeded ? "exceeded" : utilizationPercent >= BUDGET_WARNING_THRESHOLD_PERCENT ? "warning" : "safe";

    return {
      budget,
      category,
      spentMinor,
      remainingMinor,
      utilizationPercent,
      isExceeded,
      overspentMinor,
      status,
    };
  });
}

export function calculateTotalBudgetLimit(summaries: BudgetSummary[]) {
  return summaries.reduce((total, summary) => addMinor(total, summary.budget.limitMinor), 0);
}

export function calculateTotalBudgetSpent(summaries: BudgetSummary[]) {
  return summaries.reduce((total, summary) => addMinor(total, summary.spentMinor), 0);
}

export function calculateTotalRemainingVariableBudget(summaries: BudgetSummary[]) {
  return summaries.reduce((total, summary) => addMinor(total, Math.max(0, summary.remainingMinor)), 0);
}

export function calculateDailyRemainingBudgetAllowance(summaries: BudgetSummary[], range: DateRange, referenceDate = new Date()) {
  const daysRemaining = daysRemainingInPeriod(range, referenceDate);
  if (daysRemaining <= 0) {
    return 0;
  }

  return Math.floor(calculateTotalRemainingVariableBudget(summaries) / daysRemaining);
}

export function calculateSavingsGoalProgress(
  dataset: FinanceDataset,
  asOf = new Date(),
): SavingsGoalProgress[] {
  validateFinanceDataset(dataset);
  const balancesByAccountId = new Map(
    calculateAccountBalances(dataset).map(({ account, balanceMinor }) => [account.id, balanceMinor]),
  );
  const today = `${asOf.getFullYear()}-${`${asOf.getMonth() + 1}`.padStart(2, "0")}-${`${asOf.getDate()}`.padStart(2, "0")}`;

  return dataset.savingsGoals.map((goal) => {
    const linkedBalance = goal.linkedAccountId ? balancesByAccountId.get(goal.linkedAccountId) : undefined;
    const currentAmountMinor = Math.max(0, linkedBalance ?? goal.currentAmountMinor ?? 0);
    const remainingMinor = Math.max(0, subtractMinor(goal.targetMinor, currentAmountMinor));
    const progressPercent = goal.targetMinor <= 0 ? 100 : Math.max(0, Math.round((currentAmountMinor / goal.targetMinor) * 100));
    const isAchieved = goal.status === "completed" || currentAmountMinor >= goal.targetMinor;
    const isOverdue = Boolean(goal.targetDate && goal.targetDate < today && !isAchieved);
    const daysRemaining = goal.targetDate
      ? daysRemainingInPeriod({ start: today, end: goal.targetDate }, asOf)
      : 0;
    const weeksRemaining = Math.max(1, Math.ceil(daysRemaining / 7));
    const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30));

    return {
      goal,
      currentAmountMinor,
      remainingMinor,
      progressPercent,
      isAchieved,
      isOverdue,
      requiredMonthlyContributionMinor: isAchieved || !goal.targetDate ? 0 : Math.ceil(remainingMinor / monthsRemaining),
      requiredWeeklyContributionMinor: isAchieved || !goal.targetDate ? 0 : Math.ceil(remainingMinor / weeksRemaining),
    };
  });
}

export function calculatePotentialSavings(input: PotentialSavingsForecastInput): PotentialSavingsResult {
  const values = [
    input.availableLiquidCashMinor,
    input.expectedRemainingIncomeMinor,
    input.upcomingFixedExpensesMinor,
    input.remainingVariableBudgetMinor,
    input.debtObligationsMinor,
    input.safetyBufferMinor,
  ];

  for (const value of values) {
    assertSafeMinorUnits(value, "Potential savings component");
  }

  const raw = input.availableLiquidCashMinor +
    input.expectedRemainingIncomeMinor -
    input.upcomingFixedExpensesMinor -
    input.remainingVariableBudgetMinor -
    input.debtObligationsMinor -
    input.safetyBufferMinor;

  assertSafeMinorUnits(raw, "Potential savings result");

  return {
    currency: input.currency,
    amountMinor: Math.max(0, raw),
    breakdown: input,
  };
}

export function getRecentActiveTransactions(dataset: FinanceDataset, limit = 8) {
  validateFinanceDataset(dataset);
  return [...dataset.transactions]
    .filter((transaction) => transaction.status === "active")
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .slice(0, limit);
}

export function filterTransactionsByPeriod(transactions: Transaction[], range: DateRange) {
  return transactions.filter(
    (transaction) => transaction.status === "active" && isIsoDateInRange(transaction.occurredAt, range),
  );
}

function getRequiredAccount(accountsById: Map<string, Account>, accountId: string) {
  const account = accountsById.get(accountId);

  if (!account) {
    throw new Error(`Missing account ${accountId}.`);
  }

  return account;
}

function applyAccountDelta(balances: Map<string, number>, account: Account, deltaMinor: number) {
  const current = balances.get(account.id) ?? account.openingBalanceMinor;
  balances.set(account.id, addMinor(current, deltaMinor));
}
