import { getCurrentCalendarMonth, monthLabel } from "@/src/features/finance/dates";
import {
  calculateAccountBalances,
  calculateActualSavingsContribution,
  calculateBudgetSummaries,
  calculateExpenseTotal,
  calculateIncomeTotal,
  calculateNetCashFlow,
  calculateNetWorth,
  calculateSavingsGoalProgress,
  calculateTotalRemainingVariableBudget,
  calculateTotalAssets,
  calculateTotalLiabilities,
  calculateTotalSavingsBalance,
  getRecentActiveTransactions,
} from "@/src/features/finance/calculations";
import { addMinor } from "@/src/features/finance/money";
import { calculateRealPotentialSavings } from "@/src/features/planning/potentialSavings";
import type { Account, Budget, Category, FinanceDataset, MonthlyFinancePlan, SavingsGoal, Transaction } from "@/src/features/finance/types";
import { isAssetAccount } from "@/src/features/finance/validation";

export type TransactionView = {
  id: string;
  type: Transaction["type"];
  title: string;
  detail: string;
  accountName: string;
  destinationAccountName?: string;
  occurredAt: string;
  amountMinor: number;
  currency: string;
  status?: Transaction["status"];
};

export function buildFinanceDataset(
  accounts: Account[],
  categories: Category[],
  transactions: Transaction[],
  budgets: Budget[] = [],
  savingsGoals: SavingsGoal[] = [],
): FinanceDataset {
  return {
    currency: accounts[0]?.currency ?? "BDT",
    accounts,
    categories,
    transactions,
    budgets,
    savingsGoals,
    forecast: {
      currency: accounts[0]?.currency ?? "BDT",
      availableLiquidCashMinor: 0,
      expectedRemainingIncomeMinor: 0,
      upcomingFixedExpensesMinor: 0,
      remainingVariableBudgetMinor: 0,
      debtObligationsMinor: 0,
      safetyBufferMinor: 0,
    },
  };
}

export function getRealDashboardOverview(
  accounts: Account[],
  categories: Category[],
  transactions: Transaction[],
  referenceDate = new Date(),
  options: { budgets?: Budget[]; savingsGoals?: SavingsGoal[]; monthlyPlan?: MonthlyFinancePlan | null } = {},
) {
  const dataset = buildFinanceDataset(accounts, categories, transactions, options.budgets ?? [], options.savingsGoals ?? []);
  const range = getCurrentCalendarMonth(referenceDate);
  const balances = calculateAccountBalances(dataset);
  const budgetSummaries = calculateBudgetSummaries(dataset);
  const goalProgress = calculateSavingsGoalProgress(dataset, referenceDate);
  const planning = calculateRealPotentialSavings({
    accounts,
    categories,
    transactions,
    budgets: options.budgets ?? [],
    monthlyPlan: options.monthlyPlan ?? null,
    currency: dataset.currency,
    range,
    referenceDate,
  });
  const liquidBalanceMinor = balances
    .filter(({ account }) => !account.isArchived && isAssetAccount(account) && !account.isSavings)
    .reduce((total, { balanceMinor }) => addMinor(total, Math.max(0, balanceMinor)), 0);

  return {
    currency: dataset.currency,
    range,
    monthLabel: monthLabel(range.start),
    liquidBalanceMinor,
    incomeMinor: calculateIncomeTotal(dataset, range),
    expensesMinor: calculateExpenseTotal(dataset, range),
    netCashFlowMinor: calculateNetCashFlow(dataset, range),
    savedThisMonthMinor: calculateActualSavingsContribution(dataset, range),
    totalSavingsMinor: calculateTotalSavingsBalance(dataset),
    totalAssetsMinor: calculateTotalAssets(dataset),
    totalLiabilitiesMinor: calculateTotalLiabilities(dataset),
    netWorthMinor: calculateNetWorth(dataset),
    budgetRemainingMinor: calculateTotalRemainingVariableBudget(budgetSummaries),
    dailyBudgetAllowanceMinor: planning.dailyBudgetAllowanceMinor,
    budgetSummaries,
    nearLimitBudgets: budgetSummaries.filter((summary) => summary.status === "warning"),
    exceededBudgets: budgetSummaries.filter((summary) => summary.status === "exceeded"),
    goalProgress,
    potentialSavings: planning,
    recentTransactions: getTransactionViews(getRecentActiveTransactions(dataset, 6), accounts, categories),
  };
}

export function getTransactionViews(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
): TransactionView[] {
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  return transactions.map((transaction) => {
    const account = accountsById.get(transaction.accountId);
    const accountName = account?.name ?? "Archived or missing account";

    if (transaction.type === "transfer") {
      const destinationAccount = accountsById.get(transaction.destinationAccountId);
      return {
        id: transaction.id,
        type: transaction.type,
        title: "Transfer",
        detail: `${accountName} to ${destinationAccount?.name ?? "Archived or missing account"}`,
        accountName,
        destinationAccountName: destinationAccount?.name,
        occurredAt: transaction.occurredAt,
        amountMinor: transaction.amountMinor,
        currency: transaction.currency,
        status: transaction.status,
      };
    }

    if (transaction.type === "adjustment") {
      return {
        id: transaction.id,
        type: transaction.type,
        title: "Balance adjustment",
        detail: `${accountName} - ${transaction.reason}`,
        accountName,
        occurredAt: transaction.occurredAt,
        amountMinor: transaction.amountMinor,
        currency: transaction.currency,
        status: transaction.status,
      };
    }

    const category = categoriesById.get(transaction.categoryId);
    return {
      id: transaction.id,
      type: transaction.type,
      title: category?.name ?? "Archived or missing category",
      detail: `${accountName}${transaction.note ? ` - ${transaction.note}` : ""}`,
      accountName,
      occurredAt: transaction.occurredAt,
      amountMinor: transaction.amountMinor,
      currency: transaction.currency,
      status: transaction.status,
    };
  });
}

export function getAccountBalancesForDisplay(accounts: Account[], categories: Category[], transactions: Transaction[]) {
  return calculateAccountBalances(buildFinanceDataset(accounts, categories, transactions));
}
