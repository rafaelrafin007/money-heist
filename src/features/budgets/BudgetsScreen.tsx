import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View, type DimensionValue } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
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
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText tone="subtle" variant="label">
            Plan your spending
          </AppText>
          <AppText variant="title">Monthly budgets</AppText>
        </View>
        <AppButton onPress={() => router.push(`/budgets/new?monthStart=${monthStart}` as Href)} title="Add" />
      </View>

      <View style={styles.monthControls}>
        <AppButton variant="secondary" onPress={() => setMonthStart(shiftCalendarMonth(monthStart, -1))} title="Previous" />
        <View style={styles.monthLabel}>
          <AppText variant="label">{monthLabel(monthStart)}</AppText>
          <AppText tone="subtle" variant="caption">Calendar month</AppText>
        </View>
        <AppButton variant="secondary" onPress={() => setMonthStart(shiftCalendarMonth(monthStart, 1))} title="Next" />
      </View>
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
            <SummaryCard label="Total limit" value={formatMinorAsCurrency(calculateTotalBudgetLimit(summaries), currency)} />
            <SummaryCard label="Spent" value={formatMinorAsCurrency(-calculateTotalBudgetSpent(summaries), currency)} tone="danger" />
            <SummaryCard label="Remaining" value={formatMinorAsCurrency(calculateTotalRemainingVariableBudget(summaries), currency)} tone="success" />
            <SummaryCard label="Daily allowance" value={formatMinorAsCurrency(dailyAllowanceMinor, currency)} />
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
            <View style={styles.listCard}>
              {summaries.map((summary) => (
                <BudgetRow key={summary.budget.id} summary={summary} />
              ))}
            </View>
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
  const utilizationWidth = `${Math.min(100, summary.utilizationPercent)}%` as DimensionValue;
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
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, summary.status === "exceeded" ? styles.progressDanger : summary.status === "warning" ? styles.progressWarning : null, { width: utilizationWidth }]} />
      </View>
      <AppText tone="subtle" variant="caption">
        Spent {formatMinorAsCurrency(summary.spentMinor, summary.budget.currency)} of {formatMinorAsCurrency(summary.budget.limitMinor, summary.budget.currency)}
      </AppText>
    </Pressable>
  );
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "danger" }) {
  return (
    <View style={styles.summaryCard}>
      <AppText tone="subtle" variant="caption">{label}</AppText>
      <AppText tone={tone} variant="label">{value}</AppText>
    </View>
  );
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "We couldn't load your budgets. Please try again.";
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: theme.spacing.xxxl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  headerCopy: { flex: 1, gap: theme.spacing.xxs },
  monthControls: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  monthLabel: { flex: 1, alignItems: "center", gap: theme.spacing.xxs },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md, marginVertical: theme.spacing.lg },
  summaryCard: { width: "47%", minWidth: 150, flexGrow: 1, gap: theme.spacing.xs, padding: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.borderSubtle, backgroundColor: theme.colors.surface },
  notice: { padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted, marginBottom: theme.spacing.md },
  listCard: { borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.borderSubtle, backgroundColor: theme.colors.surface, overflow: "hidden", marginBottom: theme.spacing.lg },
  budgetRow: { gap: theme.spacing.sm, padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSubtle },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: theme.spacing.md },
  rowCopy: { flex: 1, gap: theme.spacing.xxs },
  progressTrack: { height: 8, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surfaceMuted, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: theme.radius.pill, backgroundColor: theme.colors.success },
  progressWarning: { backgroundColor: theme.colors.warning },
  progressDanger: { backgroundColor: theme.colors.danger },
});
