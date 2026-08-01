import { router, type Href } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View, type DimensionValue } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { useAccounts } from "@/src/features/accounts/api/accountsHooks";
import { useBudgetsForMonth } from "@/src/features/budgets/api/budgetsHooks";
import { useCategories } from "@/src/features/categories/api/categoriesHooks";
import {
  calculateActualSavingsContribution,
  calculateSavingsGoalProgress,
  calculateTotalSavingsBalance,
  type SavingsGoalProgress,
} from "@/src/features/finance/calculations";
import { getCurrentCalendarMonth } from "@/src/features/finance/dates";
import { buildFinanceDataset } from "@/src/features/finance/api/realFinanceSelectors";
import { InlineState } from "@/src/features/finance/components/InlineState";
import { formatMinorAsCurrency } from "@/src/features/finance/money";
import { useMonthlyFinancePlan } from "@/src/features/planning/api/monthlyFinancePlansHooks";
import { calculateRealPotentialSavings } from "@/src/features/planning/potentialSavings";
import { useSavingsGoals } from "@/src/features/savings/api/savingsGoalsHooks";
import { useTransactions } from "@/src/features/transactions/api/transactionsHooks";
import { theme } from "@/src/theme";

const monthRange = getCurrentCalendarMonth();

export function SavingsScreen() {
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions();
  const goals = useSavingsGoals();
  const budgets = useBudgetsForMonth(monthRange.start);
  const monthlyPlan = useMonthlyFinancePlan(monthRange.start, "BDT");
  const isLoading = accounts.isLoading || categories.isLoading || transactions.isLoading || goals.isLoading || budgets.isLoading || monthlyPlan.isLoading;
  const error = accounts.error ?? categories.error ?? transactions.error ?? goals.error ?? budgets.error ?? monthlyPlan.error;
  const dataset = useMemo(
    () => buildFinanceDataset(accounts.data ?? [], categories.data ?? [], transactions.data ?? [], budgets.data ?? [], goals.data ?? []),
    [accounts.data, budgets.data, categories.data, goals.data, transactions.data],
  );
  const goalProgress = useMemo(() => calculateSavingsGoalProgress(dataset), [dataset]);
  const savingsAccounts = (accounts.data ?? []).filter((account) => account.isSavings && !account.isArchived);
  const potentialSavings = calculateRealPotentialSavings({
    accounts: accounts.data ?? [],
    categories: categories.data ?? [],
    transactions: transactions.data ?? [],
    budgets: budgets.data ?? [],
    monthlyPlan: monthlyPlan.data ?? null,
    currency: dataset.currency,
    range: monthRange,
  });
  const activeGoals = goalProgress.filter((goal) => goal.goal.status === "active" || goal.goal.status === "paused");
  const completedGoals = goalProgress.filter((goal) => goal.goal.status === "completed");
  const archivedGoals = goalProgress.filter((goal) => goal.goal.status === "archived");
  const attentionGoal = [...activeGoals].sort((left, right) => right.requiredMonthlyContributionMinor - left.requiredMonthlyContributionMinor)[0];

  return (
    <AppScreen scroll contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText tone="subtle" variant="label">Real Supabase data</AppText>
          <AppText variant="title">Savings</AppText>
        </View>
        <AppButton onPress={() => router.push("/savings/new" as Href)} title="New goal" />
      </View>

      {isLoading ? <InlineState title="Loading savings" message="Calculating savings balances and linked goals." /> : null}
      {error ? (
        <InlineState
          actionLabel="Retry"
          message={getMessage(error)}
          onAction={() => {
            void accounts.refetch();
            void categories.refetch();
            void transactions.refetch();
            void goals.refetch();
            void budgets.refetch();
            void monthlyPlan.refetch();
          }}
          title="Savings unavailable"
        />
      ) : null}

      {!isLoading && !error ? (
        <>
          <View style={styles.summaryGrid}>
            <SummaryCard label="Total savings balance" value={formatMinorAsCurrency(calculateTotalSavingsBalance(dataset), dataset.currency)} tone="success" />
            <SummaryCard label="Saved this month" value={formatMinorAsCurrency(calculateActualSavingsContribution(dataset, monthRange), dataset.currency)} tone="success" />
            <SummaryCard label="Potential savings estimate" value={potentialSavings.status === "complete" ? formatMinorAsCurrency(potentialSavings.amountMinor, dataset.currency) : "Incomplete"} />
            <SummaryCard label="Goal needing attention" value={attentionGoal ? formatMinorAsCurrency(attentionGoal.requiredMonthlyContributionMinor, dataset.currency) : "None"} />
          </View>

          {potentialSavings.status === "incomplete" ? (
            <InlineState
              actionLabel="Complete planning"
              message={potentialSavings.warnings[0]}
              onAction={() => router.push("/planning" as Href)}
              title="Potential savings needs estimates"
            />
          ) : null}

          {savingsAccounts.length === 0 ? (
            <InlineState
              actionLabel="Create savings account"
              message="Create an active account marked as savings before creating a savings goal."
              onAction={() => router.push("/accounts/new")}
              title="No savings accounts"
            />
          ) : null}

          {goalProgress.length === 0 && savingsAccounts.length > 0 ? (
            <InlineState
              actionLabel="Create first savings goal"
              message="Link a goal to one savings account. Transfers into that account will update progress automatically."
              onAction={() => router.push("/savings/new" as Href)}
              title="No savings goals"
            />
          ) : null}

          {goalProgress.length > 0 ? (
            <>
              <AppText style={styles.sectionTitle} variant="title">Active goals</AppText>
              <View style={styles.listCard}>
                {activeGoals.map((progress) => <GoalRow key={progress.goal.id} progress={progress} />)}
                {activeGoals.length === 0 ? <AppText style={styles.emptyText} tone="subtle">No active or paused goals.</AppText> : null}
              </View>

              <AppText style={styles.sectionTitle} variant="title">Completed goals</AppText>
              <View style={styles.listCard}>
                {completedGoals.map((progress) => <GoalRow key={progress.goal.id} progress={progress} />)}
                {completedGoals.length === 0 ? <AppText style={styles.emptyText} tone="subtle">No completed goals yet.</AppText> : null}
              </View>

              <AppText style={styles.sectionTitle} variant="title">Archived goals</AppText>
              <View style={styles.listCard}>
                {archivedGoals.map((progress) => <GoalRow key={progress.goal.id} progress={progress} />)}
                {archivedGoals.length === 0 ? <AppText style={styles.emptyText} tone="subtle">No archived goals.</AppText> : null}
              </View>
            </>
          ) : null}
        </>
      ) : null}
    </AppScreen>
  );
}

function GoalRow({ progress }: { progress: SavingsGoalProgress }) {
  const visualProgress = `${Math.min(100, progress.progressPercent)}%` as DimensionValue;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/savings/${progress.goal.id}/edit` as Href)}
      style={styles.goalRow}
    >
      <View style={styles.rowTop}>
        <View style={styles.rowCopy}>
          <AppText variant="label">{progress.goal.name}</AppText>
          <AppText tone="subtle" variant="caption">
            {progress.goal.status} - {progress.goal.targetDate ?? "No target date"}
          </AppText>
        </View>
        <AppText tone={progress.isAchieved ? "success" : progress.isOverdue ? "danger" : "default"} variant="label">
          {progress.progressPercent}%
        </AppText>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: visualProgress }]} />
      </View>
      <AppText tone="subtle" variant="caption">
        {formatMinorAsCurrency(progress.currentAmountMinor, progress.goal.currency)} saved of {formatMinorAsCurrency(progress.goal.targetMinor, progress.goal.currency)}. Need {formatMinorAsCurrency(progress.requiredMonthlyContributionMinor, progress.goal.currency)} monthly.
      </AppText>
      {progress.goal.linkedAccountId ? (
        <View style={styles.rowActions}>
          <AppButton
            onPress={() => router.push({ pathname: "/transactions/new", params: { type: "transfer", destinationAccountId: progress.goal.linkedAccountId } } as Href)}
            title="Add money"
            variant="secondary"
          />
          <AppButton
            onPress={() => router.push({ pathname: "/transactions/new", params: { type: "transfer", accountId: progress.goal.linkedAccountId } } as Href)}
            title="Withdraw"
            variant="ghost"
          />
        </View>
      ) : null}
    </Pressable>
  );
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" }) {
  return (
    <View style={styles.summaryCard}>
      <AppText tone="subtle" variant="caption">{label}</AppText>
      <AppText tone={tone} variant="label">{value}</AppText>
    </View>
  );
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "Savings request failed.";
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: theme.spacing.xxxl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  headerCopy: { flex: 1, gap: theme.spacing.xxs },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  summaryCard: { width: "47%", minWidth: 150, flexGrow: 1, gap: theme.spacing.xs, padding: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.borderSubtle, backgroundColor: theme.colors.surface },
  sectionTitle: { marginTop: theme.spacing.xl, marginBottom: theme.spacing.md },
  listCard: { borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.borderSubtle, backgroundColor: theme.colors.surface, overflow: "hidden" },
  goalRow: { gap: theme.spacing.sm, padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSubtle },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: theme.spacing.md },
  rowCopy: { flex: 1, gap: theme.spacing.xxs },
  progressTrack: { height: 8, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surfaceMuted, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: theme.radius.pill, backgroundColor: theme.colors.success },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  emptyText: { padding: theme.spacing.lg, textAlign: "center" },
});
