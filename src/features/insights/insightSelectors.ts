import {
  BUDGET_WARNING_THRESHOLD_PERCENT,
  calculateActualSavingsContribution,
  calculateBudgetSummaries,
  calculateExpenseTotal,
  calculateIncomeTotal,
  calculateSavingsGoalProgress,
} from "@/src/features/finance/calculations";
import {
  getCalendarMonthRange,
  getCurrentCalendarMonth,
  monthLabel,
  shiftCalendarMonth,
  type DateRange,
} from "@/src/features/finance/dates";
import { addMinor, formatMinorAsCurrency } from "@/src/features/finance/money";
import type { Category, FinanceDataset, Transaction } from "@/src/features/finance/types";
import { activeTransactionsInRange } from "@/src/features/finance/validation";
import type { RealPotentialSavingsResult } from "@/src/features/planning/potentialSavings";

export type CashFlowMonth = {
  monthStart: string;
  label: string;
  incomeMinor: number;
  expensesMinor: number;
  currency: string;
};

export type ExpenseCategorySlice = {
  categoryId: string;
  categoryName: string;
  amountMinor: number;
  percentage: number;
  currency: string;
};

export type SavingsTrendMonth = {
  monthStart: string;
  label: string;
  savedMinor: number;
  currency: string;
};

export type BudgetHealthSummary = {
  totalLimitMinor: number;
  totalSpentMinor: number;
  totalRemainingMinor: number;
  nearLimitCount: number;
  exceededCount: number;
  rankedBudgets: {
    budgetId: string;
    categoryName: string;
    utilizationPercent: number;
    spentMinor: number;
    limitMinor: number;
    status: "safe" | "warning" | "exceeded";
    currency: string;
  }[];
  currency: string;
};

export type FinanceInsight = {
  id: string;
  title: string;
  detail: string;
  tone: "default" | "success" | "warning" | "danger";
};

export function getRecentMonthStarts(referenceDate = new Date(), count = 6) {
  const currentStart = getCurrentCalendarMonth(referenceDate).start;
  return Array.from({ length: count }, (_, index) => shiftCalendarMonth(currentStart, index - count + 1));
}

export function getCashFlowChartData(
  dataset: FinanceDataset,
  referenceDate = new Date(),
  options: { months?: number; currency?: string } = {},
): CashFlowMonth[] {
  const currency = options.currency ?? dataset.currency;
  return getRecentMonthStarts(referenceDate, options.months ?? 6).map((monthStart) => {
    const range = getCalendarMonthRange(monthStart);
    const currencyDataset = withCurrency(dataset, currency);

    return {
      monthStart,
      label: compactMonthLabel(monthStart),
      incomeMinor: calculateIncomeTotal(currencyDataset, range),
      expensesMinor: calculateExpenseTotal(currencyDataset, range),
      currency,
    };
  });
}

export function getExpenseCategoryChartData(
  dataset: FinanceDataset,
  referenceDate = new Date(),
  options: { currency?: string; limit?: number } = {},
): ExpenseCategorySlice[] {
  const currency = options.currency ?? dataset.currency;
  const range = getCurrentCalendarMonth(referenceDate);
  const categoriesById = new Map(dataset.categories.map((category) => [category.id, category]));
  const totals = new Map<string, number>();

  for (const transaction of activeExpenseTransactions(dataset.transactions, range, currency)) {
    totals.set(transaction.categoryId, addMinor(totals.get(transaction.categoryId) ?? 0, transaction.amountMinor));
  }

  const ranked = [...totals.entries()]
    .map(([categoryId, amountMinor]) => ({
      categoryId,
      categoryName: categoriesById.get(categoryId)?.name ?? "Archived category",
      amountMinor,
      currency,
    }))
    .sort((left, right) => right.amountMinor - left.amountMinor);

  const limit = options.limit ?? 5;
  const visible = ranked.slice(0, limit);
  const hidden = ranked.slice(limit);
  const hiddenTotal = hidden.reduce((total, item) => addMinor(total, item.amountMinor), 0);
  const combined = hiddenTotal > 0
    ? [...visible, { categoryId: "other", categoryName: "Other", amountMinor: hiddenTotal, currency }]
    : visible;
  const total = combined.reduce((sum, item) => addMinor(sum, item.amountMinor), 0);

  return combined.map((item) => ({
    ...item,
    percentage: total > 0 ? Math.round((item.amountMinor / total) * 100) : 0,
  }));
}

export function getSavingsTrendData(
  dataset: FinanceDataset,
  referenceDate = new Date(),
  options: { months?: number; currency?: string } = {},
): SavingsTrendMonth[] {
  const currency = options.currency ?? dataset.currency;
  const currencyDataset = withCurrency(dataset, currency);

  return getRecentMonthStarts(referenceDate, options.months ?? 6).map((monthStart) => {
    const range = getCalendarMonthRange(monthStart);
    return {
      monthStart,
      label: compactMonthLabel(monthStart),
      savedMinor: calculateActualSavingsContribution(currencyDataset, range),
      currency,
    };
  });
}

export function getBudgetHealthSummary(dataset: FinanceDataset, currency = dataset.currency): BudgetHealthSummary {
  const summaries = calculateBudgetSummaries(withCurrency(dataset, currency));
  const totalLimitMinor = summaries.reduce((total, summary) => addMinor(total, summary.budget.limitMinor), 0);
  const totalSpentMinor = summaries.reduce((total, summary) => addMinor(total, summary.spentMinor), 0);
  const totalRemainingMinor = summaries.reduce((total, summary) => addMinor(total, Math.max(0, summary.remainingMinor)), 0);

  return {
    totalLimitMinor,
    totalSpentMinor,
    totalRemainingMinor,
    nearLimitCount: summaries.filter((summary) => summary.status === "warning").length,
    exceededCount: summaries.filter((summary) => summary.status === "exceeded").length,
    rankedBudgets: summaries
      .map((summary) => ({
        budgetId: summary.budget.id,
        categoryName: summary.category.name,
        utilizationPercent: summary.utilizationPercent,
        spentMinor: summary.spentMinor,
        limitMinor: summary.budget.limitMinor,
        status: summary.status,
        currency: summary.budget.currency,
      }))
      .sort((left, right) => right.utilizationPercent - left.utilizationPercent),
    currency,
  };
}

export function getFinanceInsights(
  dataset: FinanceDataset,
  referenceDate = new Date(),
  options: { currency?: string; potentialSavingsStatus?: RealPotentialSavingsResult["status"]; potentialSavingsWarnings?: string[] } = {},
): FinanceInsight[] {
  const currency = options.currency ?? dataset.currency;
  const currencyDataset = withCurrency(dataset, currency);
  const currentRange = getCurrentCalendarMonth(referenceDate);
  const previousRange = getCalendarMonthRange(shiftCalendarMonth(currentRange.start, -1));
  const insights: FinanceInsight[] = [];

  const categories = getExpenseCategoryChartData(currencyDataset, referenceDate, { currency, limit: 1 });
  const largestCategory = categories[0];
  if (largestCategory) {
    insights.push({
      id: "largest-expense-category",
      title: `${largestCategory.categoryName} is your largest expense category this month.`,
      detail: `${largestCategory.percentage}% of recorded monthly expenses are in this category.`,
      tone: "default",
    });
  }

  addMonthChangeInsight(insights, "income-change", "income", calculateIncomeTotal(currencyDataset, currentRange), calculateIncomeTotal(currencyDataset, previousRange));
  addMonthChangeInsight(insights, "expense-change", "expenses", calculateExpenseTotal(currencyDataset, currentRange), calculateExpenseTotal(currencyDataset, previousRange));

  const dailyAverageMinor = getAverageDailyExpense(currencyDataset, currentRange, referenceDate);
  if (dailyAverageMinor !== null) {
    insights.push({
      id: "average-daily-expense",
      title: "Average daily spending is based on this month's active expenses.",
      detail: `${formatMinorAsCurrency(dailyAverageMinor, currency)} per elapsed day.`,
      tone: "default",
    });
  }

  const budgetHealth = getBudgetHealthSummary(currencyDataset, currency);
  if (budgetHealth.nearLimitCount > 0) {
    insights.push({
      id: "budget-near-limit",
      title: `${budgetHealth.nearLimitCount} budget${budgetHealth.nearLimitCount === 1 ? " is" : "s are"} close to the limit.`,
      detail: `Near-limit means at least ${BUDGET_WARNING_THRESHOLD_PERCENT}% used.`,
      tone: "warning",
    });
  }

  if (budgetHealth.exceededCount > 0) {
    insights.push({
      id: "budget-exceeded",
      title: `${budgetHealth.exceededCount} budget${budgetHealth.exceededCount === 1 ? " is" : "s are"} over budget.`,
      detail: "Only active expenses in each budget category are counted.",
      tone: "danger",
    });
  }

  const paceInsight = getBudgetPaceInsight(currencyDataset, currentRange, referenceDate);
  if (paceInsight) {
    insights.push(paceInsight);
  }

  const savedMinor = calculateActualSavingsContribution(currencyDataset, currentRange);
  if (savedMinor !== 0) {
    insights.push({
      id: "net-savings-contribution",
      title: savedMinor >= 0 ? "Savings transfers increased savings this month." : "Savings withdrawals reduced savings this month.",
      detail: `${formatMinorAsCurrency(Math.abs(savedMinor), currency)} net savings contribution.`,
      tone: savedMinor >= 0 ? "success" : "warning",
    });
  }

  const highestDay = getHighestSpendingDay(currencyDataset, currentRange);
  if (highestDay) {
    insights.push({
      id: "highest-spending-day",
      title: `${highestDay.date} had the highest recorded spending this month.`,
      detail: `${formatMinorAsCurrency(highestDay.amountMinor, currency)} in active expenses.`,
      tone: "default",
    });
  }

  const goal = calculateSavingsGoalProgress(currencyDataset, referenceDate)
    .filter((progress) => progress.goal.status === "active" || progress.goal.status === "paused")
    .sort((left, right) => right.requiredMonthlyContributionMinor - left.requiredMonthlyContributionMinor)[0];
  if (goal && goal.requiredMonthlyContributionMinor > 0) {
    insights.push({
      id: "goal-largest-contribution",
      title: `${goal.goal.name} needs the largest monthly contribution.`,
      detail: `${formatMinorAsCurrency(goal.requiredMonthlyContributionMinor, goal.goal.currency)} per month based on the target date.`,
      tone: "default",
    });
  }

  if (options.potentialSavingsStatus === "incomplete") {
    insights.push({
      id: "potential-savings-incomplete",
      title: "Complete your monthly plan to estimate potential savings.",
      detail: options.potentialSavingsWarnings?.[0] ?? "Expected income, obligations, budgets, and buffer all improve the estimate.",
      tone: "warning",
    });
  }

  if (insights.length === 0) {
    return [
      {
        id: "no-data",
        title: "No insights yet.",
        detail: "Add accounts, income, expenses, budgets, and savings activity to unlock useful observations.",
        tone: "default",
      },
    ];
  }

  return insights;
}

function withCurrency(dataset: FinanceDataset, currency: string): FinanceDataset {
  return {
    ...dataset,
    currency,
    accounts: dataset.accounts.filter((account) => account.currency === currency),
    categories: dataset.categories,
    transactions: dataset.transactions.filter((transaction) => transaction.currency === currency),
    budgets: dataset.budgets.filter((budget) => budget.currency === currency),
    savingsGoals: dataset.savingsGoals.filter((goal) => goal.currency === currency),
    forecast: { ...dataset.forecast, currency },
  };
}

function activeExpenseTransactions(transactions: Transaction[], range: DateRange, currency: string) {
  return activeTransactionsInRange(transactions, range).filter(
    (transaction): transaction is Extract<Transaction, { type: "expense" }> =>
      transaction.type === "expense" && transaction.currency === currency,
  );
}

function compactMonthLabel(monthStart: string) {
  const [month, year] = monthLabel(monthStart).split(" ");
  return `${month.slice(0, 3)} ${year}`;
}

function addMonthChangeInsight(
  insights: FinanceInsight[],
  id: string,
  label: "income" | "expenses",
  currentMinor: number,
  previousMinor: number,
) {
  if (previousMinor <= 0) {
    return;
  }

  const changePercent = Math.round(((currentMinor - previousMinor) / previousMinor) * 100);
  if (changePercent === 0) {
    return;
  }

  insights.push({
    id,
    title: `Monthly ${label} ${changePercent > 0 ? "increased" : "decreased"} by ${Math.abs(changePercent)}%.`,
    detail: "Compared with the previous calendar month.",
    tone: label === "expenses" && changePercent > 0 ? "warning" : "default",
  });
}

function getAverageDailyExpense(dataset: FinanceDataset, range: DateRange, referenceDate: Date) {
  const spentMinor = calculateExpenseTotal(dataset, range);
  if (spentMinor <= 0) {
    return null;
  }

  const elapsedDays = Math.max(1, Math.min(new Date(referenceDate).getDate(), Number(range.end.slice(-2))));
  return Math.round(spentMinor / elapsedDays);
}

function getBudgetPaceInsight(dataset: FinanceDataset, range: DateRange, referenceDate: Date): FinanceInsight | null {
  const elapsedDays = Math.max(1, Math.min(new Date(referenceDate).getDate(), Number(range.end.slice(-2))));
  const monthDays = Number(range.end.slice(-2));
  const projected = calculateBudgetSummaries(dataset)
    .filter((summary) => summary.status !== "exceeded" && summary.spentMinor > 0)
    .map((summary) => ({
      summary,
      projectedMinor: Math.round((summary.spentMinor / elapsedDays) * monthDays),
    }))
    .filter((item) => item.projectedMinor > item.summary.budget.limitMinor)
    .sort((left, right) => right.projectedMinor - left.projectedMinor)[0];

  if (!projected) {
    return null;
  }

  return {
    id: "budget-spending-pace",
    title: `${projected.summary.category.name} may pass its budget at the current pace.`,
    detail: `Estimated month-end spending is ${formatMinorAsCurrency(projected.projectedMinor, projected.summary.budget.currency)}.`,
    tone: "warning",
  };
}

function getHighestSpendingDay(dataset: FinanceDataset, range: DateRange) {
  const totals = new Map<string, number>();
  for (const transaction of activeExpenseTransactions(dataset.transactions, range, dataset.currency)) {
    totals.set(transaction.occurredAt, addMinor(totals.get(transaction.occurredAt) ?? 0, transaction.amountMinor));
  }

  return [...totals.entries()]
    .map(([date, amountMinor]) => ({ date, amountMinor }))
    .sort((left, right) => right.amountMinor - left.amountMinor)[0] ?? null;
}
