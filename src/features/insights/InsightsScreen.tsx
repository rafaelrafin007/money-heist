import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { SectionHeader } from "@/src/components/SectionHeader";
import { useAccounts } from "@/src/features/accounts/api/accountsHooks";
import { useBudgetsForMonth } from "@/src/features/budgets/api/budgetsHooks";
import { useCategories } from "@/src/features/categories/api/categoriesHooks";
import { buildFinanceDataset } from "@/src/features/finance/api/realFinanceSelectors";
import { InlineState } from "@/src/features/finance/components/InlineState";
import { getCurrentCalendarMonth } from "@/src/features/finance/dates";
import {
  BudgetHealthCard,
  CashFlowChart,
  ExpenseCategoryChart,
  InsightList,
  SavingsTrendChart,
} from "@/src/features/insights/components/FinanceCharts";
import {
  getBudgetHealthSummary,
  getCashFlowChartData,
  getExpenseCategoryChartData,
  getFinanceInsights,
  getSavingsTrendData,
} from "@/src/features/insights/insightSelectors";
import { useMonthlyFinancePlan } from "@/src/features/planning/api/monthlyFinancePlansHooks";
import { calculateRealPotentialSavings } from "@/src/features/planning/potentialSavings";
import { useSavingsGoals } from "@/src/features/savings/api/savingsGoalsHooks";
import { useTransactions } from "@/src/features/transactions/api/transactionsHooks";
import { theme } from "@/src/theme";

export function InsightsScreen() {
  const range = getCurrentCalendarMonth();
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions();
  const budgets = useBudgetsForMonth(range.start);
  const goals = useSavingsGoals();
  const monthlyPlan = useMonthlyFinancePlan(range.start, "BDT");
  const isLoading = accounts.isLoading || categories.isLoading || transactions.isLoading || budgets.isLoading || goals.isLoading || monthlyPlan.isLoading;
  const error = accounts.error ?? categories.error ?? transactions.error ?? budgets.error ?? goals.error ?? monthlyPlan.error;
  const dataset = useMemo(
    () => buildFinanceDataset(accounts.data ?? [], categories.data ?? [], transactions.data ?? [], budgets.data ?? [], goals.data ?? []),
    [accounts.data, budgets.data, categories.data, goals.data, transactions.data],
  );
  const potentialSavings = calculateRealPotentialSavings({
    accounts: accounts.data ?? [],
    categories: categories.data ?? [],
    transactions: transactions.data ?? [],
    budgets: budgets.data ?? [],
    monthlyPlan: monthlyPlan.data ?? null,
    currency: dataset.currency,
    range,
  });
  const cashFlow = useMemo(() => getCashFlowChartData(dataset), [dataset]);
  const categoriesChart = useMemo(() => getExpenseCategoryChartData(dataset), [dataset]);
  const savingsTrend = useMemo(() => getSavingsTrendData(dataset), [dataset]);
  const budgetHealth = useMemo(() => getBudgetHealthSummary(dataset), [dataset]);
  const insights = useMemo(
    () =>
      getFinanceInsights(dataset, new Date(), {
        potentialSavingsStatus: potentialSavings.status,
        potentialSavingsWarnings: potentialSavings.warnings,
      }),
    [dataset, potentialSavings.status, potentialSavings.warnings],
  );

  return (
    <AppScreen scroll contentStyle={styles.screenContent}>
      <SectionHeader
        action={<AppButton onPress={() => router.push("/dashboard")} title="Home" variant="secondary" />}
        eyebrow="Charts and observations"
        subtitle="Insights are based only on your recorded accounts, budgets, goals, and active transactions."
        title="Insights"
      />

      {isLoading ? <InlineState title="Loading insights" message="Preparing charts and observations." /> : null}
      {error ? (
        <InlineState
          actionLabel="Retry"
          message={getMessage(error)}
          onAction={() => {
            void accounts.refetch();
            void categories.refetch();
            void transactions.refetch();
            void budgets.refetch();
            void goals.refetch();
            void monthlyPlan.refetch();
          }}
          title="We couldn't load insights"
        />
      ) : null}

      {!isLoading && !error ? (
        <View style={styles.contentStack}>
          <CashFlowChart data={cashFlow} />
          <ExpenseCategoryChart data={categoriesChart} />
          <SavingsTrendChart data={savingsTrend} />
          <BudgetHealthCard summary={budgetHealth} />
          <InsightList insights={insights} />
        </View>
      ) : null}
    </AppScreen>
  );
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "We couldn't load insights. Please try again.";
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: theme.spacing.xxxl,
  },
  contentStack: {
    gap: theme.spacing.lg,
  },
});
