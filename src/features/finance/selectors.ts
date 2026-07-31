import { getCurrentCalendarMonth, monthLabel, type DateRange } from "@/src/features/finance/dates";
import { demoFinanceData } from "@/src/features/finance/demoData";
import {
  calculateAccountBalances,
  calculateActualSavingsContribution,
  calculateBudgetSummaries,
  calculateExpenseTotal,
  calculateIncomeTotal,
  calculateNetCashFlow,
  calculateNetWorth,
  calculatePotentialSavings,
  calculateSavingsGoalProgress,
  calculateTotalAssets,
  calculateTotalLiabilities,
  calculateTotalSavingsBalance,
  getRecentActiveTransactions,
} from "@/src/features/finance/calculations";
import { addMinor } from "@/src/features/finance/money";
import { isAssetAccount } from "@/src/features/finance/validation";
import type { FinanceDataset, Transaction } from "@/src/features/finance/types";

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
};

export function getFinanceDataset() {
  return demoFinanceData;
}

export function getDashboardOverview(dataset: FinanceDataset = demoFinanceData, range = getCurrentCalendarMonth()) {
  const balances = calculateAccountBalances(dataset);
  const liquidBalanceMinor = balances
    .filter(({ account }) => !account.isArchived && isAssetAccount(account) && !account.isSavings)
    .reduce((total, { balanceMinor }) => addMinor(total, Math.max(0, balanceMinor)), 0);
  const potentialSavings = calculatePotentialSavings(dataset.forecast);

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
    potentialSavings,
    netWorthMinor: calculateNetWorth(dataset),
    recentTransactions: getTransactionViews(getRecentActiveTransactions(dataset, 6), dataset),
  };
}

export function getTransactionViews(transactions: Transaction[], dataset: FinanceDataset = demoFinanceData): TransactionView[] {
  const accountsById = new Map(dataset.accounts.map((account) => [account.id, account]));
  const categoriesById = new Map(dataset.categories.map((category) => [category.id, category]));

  return transactions.map((transaction) => {
    const account = accountsById.get(transaction.accountId);
    const accountName = account?.name ?? "Unknown account";

    if (transaction.type === "transfer") {
      const destinationAccount = accountsById.get(transaction.destinationAccountId);
      return {
        id: transaction.id,
        type: transaction.type,
        title: "Transfer",
        detail: `${accountName} to ${destinationAccount?.name ?? "Unknown account"}`,
        accountName,
        destinationAccountName: destinationAccount?.name,
        occurredAt: transaction.occurredAt,
        amountMinor: transaction.amountMinor,
        currency: transaction.currency,
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
      };
    }

    const category = categoriesById.get(transaction.categoryId);

    return {
      id: transaction.id,
      type: transaction.type,
      title: category?.name ?? "Uncategorized",
      detail: `${accountName}${transaction.note ? ` - ${transaction.note}` : ""}`,
      accountName,
      occurredAt: transaction.occurredAt,
      amountMinor: transaction.amountMinor,
      currency: transaction.currency,
    };
  });
}

export function getTransactionsOverview(dataset: FinanceDataset = demoFinanceData, range?: DateRange) {
  const activeTransactions = dataset.transactions
    .filter((transaction) => transaction.status === "active")
    .filter((transaction) => (range ? transaction.occurredAt >= range.start && transaction.occurredAt <= range.end : true))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  return {
    currency: dataset.currency,
    transactions: getTransactionViews(activeTransactions, dataset),
  };
}

export function getBudgetsOverview(dataset: FinanceDataset = demoFinanceData) {
  return {
    currency: dataset.currency,
    budgets: calculateBudgetSummaries(dataset),
  };
}

export function getSavingsOverview(dataset: FinanceDataset = demoFinanceData, range = getCurrentCalendarMonth()) {
  return {
    currency: dataset.currency,
    totalSavingsMinor: calculateTotalSavingsBalance(dataset),
    savedThisMonthMinor: calculateActualSavingsContribution(dataset, range),
    potentialSavings: calculatePotentialSavings(dataset.forecast),
    goals: calculateSavingsGoalProgress(dataset),
  };
}

export function getSettingsOverview(dataset: FinanceDataset = demoFinanceData) {
  return {
    currency: dataset.currency,
    financialMonth: "Calendar month",
    financeData: "Demo mode",
    cloudFinanceSync: "Not enabled yet",
  };
}
