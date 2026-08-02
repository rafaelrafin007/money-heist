import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { MetricTile } from "@/src/components/MetricTile";
import { ProgressBar } from "@/src/components/ProgressBar";
import { SectionHeader } from "@/src/components/SectionHeader";
import { useAccounts } from "@/src/features/accounts/api/accountsHooks";
import { useBudgetsForMonth, useCopyBudgets } from "@/src/features/budgets/api/budgetsHooks";
import { useCategories } from "@/src/features/categories/api/categoriesHooks";
import {
  calculateBudgetSummaries,
  calculateDailyRemainingBudgetAllowance,
  calculateTotalBudgetLimit,
  calculateTotalBudgetSpent,
  calculateTotalRemainingVariableBudget,
  type BudgetSummary,
} from "@/src/features/finance/calculations";
import { getCalendarMonthRange, getCurrentCalendarMonth, monthLabel, shiftCalendarMonth } from "@/src/features/finance/dates";
import { buildFinanceDataset } from "@/src/features/finance/api/realFinanceSelectors";
import { InlineState } from "@/src/features/finance/components/InlineState";
import { formatMinorAsCurrency } from "@/src/features/finance/money";
import { BudgetHealthCard } from "@/src/features/insights/components/FinanceCharts";
import { getBudgetHealthSummary } from "@/src/features/insights/insightSelectors";
import { useTransactions } from "@/src/features/transactions/api/transactionsHooks";
import { theme } from "@/src/theme";

const currentMonthStart = getCurrentCalendarMonth().start;

export function BudgetsScreen() {
  const [monthStart, setMonthStart] = useState(currentMonthStart);
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions();
  const budgets = useBudgetsForMonth(monthStart);
  const copyBudgets = useCopyBudgets(monthStart);
  const [notice, setNotice] = useState<string>();
  const monthRange = useMemo(() => getCalendarMonthRange(monthStart), [monthStart]);
  const isLoading = accounts.isLoading || categories.isLoading || transactions.isLoading || budgets.isLoading;
  const error = accounts.error ?? categories.error ?? transactions.error ?? budgets.error;
  const dataset = useMemo(
    () => buildFinanceDataset(accounts.data ?? [], categories.data ?? [], transactions.data ?? [], budgets.data ?? []),
    [accounts.data, budgets.data, categories.data, transactions.data],
  );
  const summaries = useMemo(() => calculateBudgetSummaries(dataset), [dataset]);
  const budgetHealth = useMemo(() => getBudgetHealthSummary(dataset), [dataset]);
  const currency = dataset.currency;
  const dailyAllowanceMinor = calculateDailyRemainingBudgetAllowance(summaries, monthRange);

  async function handleCopyPreviousMonth() {
    setNotice(undefined);
    try {
      const copied = await copyBudgets.mutateAsync();
      setNotice(copied === 0 ? "No new budgets were copied. They may already exist." : `${copied} budget${copied === 1 ? "" : "s"} copied.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Budgets could not be copied.");
    }
  }

  return (
    <AppScreen scroll contentStyle={styles.screenContent}>
      <SectionHeader
        action={<AppButton onPress={() => router.push(`/budgets/new?monthStart=${monthStart}` as Href)} title="Add" />}
        eyebrow="Plan your spending"
        subtitle="Track category limits and see how much room is left this month."
        title="Monthly budgets"
      />

      <AppCard padding="md" style={styles.monthCard}>
        <View style={styles.monthControls}>
        <AppButton variant="secondary" onPress={() => setMonthStart(shiftCalendarMonth(monthStart, -1))} title="Previous" />
        <View style={styles.monthLabel}>
          <AppText variant="label">{monthLabel(monthStart)}</AppText>
          <AppText tone="subtle" variant="caption">Calendar month</AppText>
        </View>
        <AppButton variant="secondary" onPress={() => setMonthStart(shiftCalendarMonth(monthStart, 1))} title="Next" />
        </View>
      </AppCard>
      {monthStart !== currentMonthStart ? (
        <AppButton variant="ghost" onPress={() => setMonthStart(currentMonthStart)} title="Return to current month" />
      ) : null}

      {isLoading ? <InlineState title="Loading budgets" message="Getting your monthly budgets." /> : null}
      {error ? (
        <InlineState
          actionLabel="Retry"
          message={getMessage(error)}
          onAction={() => {
            void accounts.refetch();
            void categories.refetch();
            void transactions.refetch();
            void budgets.refetch();
          }}
          title="We couldn't load your budgets"
        />
      ) : null}

      {!isLoading && !error ? (
        <>
          <View style={styles.summaryGrid}>
            <MetricTile label="Total limit" value={formatMinorAsCurrency(calculateTotalBudgetLimit(summaries), currency)} tone="primary" />
            <MetricTile label="Spent" value={formatMinorAsCurrency(-calculateTotalBudgetSpent(summaries), currency)} tone="danger" />
            <MetricTile label="Remaining" value={formatMinorAsCurrency(calculateTotalRemainingVariableBudget(summaries), currency)} tone="success" />
            <MetricTile label="Daily allowance" value={formatMinorAsCurrency(dailyAllowanceMinor, currency)} />
          </View>

          {notice ? (
            <AppText style={styles.notice} tone="subtle" variant="caption">
              {notice}
            </AppText>
          ) : null}

          {summaries.length === 0 ? (
            <InlineState
              actionLabel="Create first budget"
              message="Create a budget to plan your spending."
              onAction={() => router.push(`/budgets/new?monthStart=${monthStart}` as Href)}
              title="No budgets for this month"
            />
          ) : (
            <>
              <BudgetHealthCard summary={budgetHealth} />
              <AppCard padding="none" style={styles.listCard}>
                {summaries.map((summary) => (
                  <BudgetRow key={summary.budget.id} summary={summary} />
                ))}
              </AppCard>
            </>
          )}

          <AppButton
            loading={copyBudgets.isPending}
            onPress={handleCopyPreviousMonth}
            title="Copy previous month's budgets"
            variant="secondary"
          />
        </>
      ) : null}
    </AppScreen>
  );
}

function BudgetRow({ summary }: { summary: BudgetSummary }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/budgets/${summary.budget.id}/edit?monthStart=${summary.budget.periodStart}` as Href)}
      style={styles.budgetRow}
    >
      <View style={styles.rowTop}>
        <View style={styles.rowCopy}>
          <AppText variant="label">{summary.category.name}</AppText>
          <AppText tone="subtle" variant="caption">
            {summary.status === "safe" ? "Safe" : summary.status === "warning" ? "Warning: close to limit" : "Exceeded"} - {summary.utilizationPercent}% used
          </AppText>
        </View>
        <AppText tone={summary.isExceeded ? "danger" : "success"} variant="label">
          {summary.isExceeded
            ? `${formatMinorAsCurrency(-summary.overspentMinor, summary.budget.currency)} over`
            : `${formatMinorAsCurrency(Math.max(0, summary.remainingMinor), summary.budget.currency)} left`}
        </AppText>
      </View>
      <ProgressBar value={summary.utilizationPercent} tone={summary.status === "exceeded" ? "danger" : summary.status === "warning" ? "warning" : "success"} />
      <AppText tone="subtle" variant="caption">
        Spent {formatMinorAsCurrency(summary.spentMinor, summary.budget.currency)} of {formatMinorAsCurrency(summary.budget.limitMinor, summary.budget.currency)}
      </AppText>
    </Pressable>
  );
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "We couldn't load your budgets. Please try again.";
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: theme.spacing.xxxl },
  monthCard: { marginBottom: theme.spacing.sm },
  monthControls: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  monthLabel: { flex: 1, alignItems: "center", gap: theme.spacing.xxs },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md, marginVertical: theme.spacing.lg },
  notice: { padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted, marginBottom: theme.spacing.md },
  listCard: { marginBottom: theme.spacing.lg, ...theme.shadows.card },
  budgetRow: { gap: theme.spacing.sm, padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSubtle },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: theme.spacing.md },
  rowCopy: { flex: 1, gap: theme.spacing.xxs },
});
