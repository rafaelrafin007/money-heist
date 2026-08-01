import {
  calculateActualSavingsContribution,
  calculateExpenseTotal,
  calculateIncomeTotal,
  calculateNetCashFlow,
} from "@/src/features/finance/calculations";
import { getCurrentCalendarMonth, toIsoDate, type DateRange } from "@/src/features/finance/dates";
import type { FinanceDataset, Transaction } from "@/src/features/finance/types";

export type TransactionPeriodSummary = {
  range: DateRange;
  incomeMinor: number;
  expensesMinor: number;
  netCashFlowMinor: number;
  savedMinor: number;
  activeTransactionCount: number;
};

export type GroupedTransactionsByDate = {
  date: string;
  label: string;
  transactions: Transaction[];
  summary: TransactionPeriodSummary;
};

export function getTodayTransactionSummary(dataset: FinanceDataset, referenceDate = new Date()): TransactionPeriodSummary {
  const today = toIsoDate(referenceDate);
  return getTransactionSummaryForRange(dataset, { start: today, end: today });
}

export function getThisMonthTransactionSummary(dataset: FinanceDataset, referenceDate = new Date()): TransactionPeriodSummary {
  return getTransactionSummaryForRange(dataset, getCurrentCalendarMonth(referenceDate));
}

export function getTransactionSummaryForRange(dataset: FinanceDataset, range: DateRange): TransactionPeriodSummary {
  const activeTransactionCount = dataset.transactions.filter(
    (transaction) => transaction.status === "active" && transaction.occurredAt >= range.start && transaction.occurredAt <= range.end,
  ).length;

  return {
    range,
    incomeMinor: calculateIncomeTotal(dataset, range),
    expensesMinor: calculateExpenseTotal(dataset, range),
    netCashFlowMinor: calculateNetCashFlow(dataset, range),
    savedMinor: calculateActualSavingsContribution(dataset, range),
    activeTransactionCount,
  };
}

export function groupTransactionsByCalendarDate(
  dataset: FinanceDataset,
  transactions: Transaction[],
  referenceDate = new Date(),
): GroupedTransactionsByDate[] {
  const today = toIsoDate(referenceDate);
  const yesterday = toIsoDate(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() - 1));
  const groups = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    const current = groups.get(transaction.occurredAt) ?? [];
    current.push(transaction);
    groups.set(transaction.occurredAt, current);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, groupTransactions]) => ({
      date,
      label: date === today ? "Today" : date === yesterday ? "Yesterday" : date,
      transactions: groupTransactions.sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      summary: getTransactionSummaryForRange(dataset, { start: date, end: date }),
    }));
}
