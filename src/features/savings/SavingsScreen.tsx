import { router, type Href } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { MetricTile } from "@/src/components/MetricTile";
import { ProgressBar } from "@/src/components/ProgressBar";
import { SectionHeader } from "@/src/components/SectionHeader";
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
  const savingsDestinationHref = savingsAccounts.length === 1
    ? `/transactions/new?type=transfer&mode=savings&destinationAccountId=${savingsAccounts[0].id}`
    : "/transactions/new?type=transfer&mode=savings";
  const savingsSourceHref = savingsAccounts.length === 1
    ? `/transactions/new?type=transfer&sourceAccountId=${savingsAccounts[0].id}`
    : "/transactions/new?type=transfer";
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
      <SectionHeader
        action={<AppButton onPress={() => router.push("/savings/new" as Href)} title="New goal" />}
        eyebrow="Goals and progress"
        subtitle="See saved balances, goal progress, and quick savings transfers."
        title="Savings"
      />

      {isLoading ? <InlineState title="Loading savings" message="Getting your savings balances and goals." /> : null}
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
          title="We couldn't load your savings"
        />
      ) : null}

      {!isLoading && !error ? (
        <>
          <View style={styles.summaryGrid}>
            <MetricTile label="Total savings balance" value={formatMinorAsCurrency(calculateTotalSavingsBalance(dataset), dataset.currency)} tone="success" />
            <MetricTile label="Saved this month" value={formatMinorAsCurrency(calculateActualSavingsContribution(dataset, monthRange), dataset.currency)} tone="success" />
            <MetricTile label="Potential savings estimate" value={potentialSavings.status === "complete" ? formatMinorAsCurrency(potentialSavings.amountMinor, dataset.currency) : "Incomplete"} tone={potentialSavings.status === "complete" ? "primary" : "warning"} />
            <MetricTile label="Goal needing attention" value={attentionGoal ? formatMinorAsCurrency(attentionGoal.requiredMonthlyContributionMinor, dataset.currency) : "None"} />
          </View>

          <AppCard style={styles.actionCard}>
            <AppText variant="label">Savings actions</AppText>
            <AppText tone="subtle" variant="caption">
              Saving money creates a transfer into a savings account. It is not recorded as an expense.
            </AppText>
            {savingsAccounts.length === 0 ? (
              <AppButton onPress={() => router.push("/accounts/new?savings=true" as Href)} title="Create a savings account before saving money" />
            ) : (
              <>
                <AppButton onPress={() => router.push(savingsDestinationHref as Href)} title="Save money" />
                <AppButton onPress={() => router.push(savingsSourceHref as Href)} title="Withdraw from savings" variant="secondary" />
              </>
            )}
          </AppCard>

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
              onAction={() => router.push("/accounts/new?savings=true" as Href)}
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
              <SectionHeader title="Active goals" />
              <AppCard padding="none" style={styles.listCard}>
                {activeGoals.map((progress) => <GoalRow key={progress.goal.id} progress={progress} />)}
                {activeGoals.length === 0 ? <AppText style={styles.emptyText} tone="subtle">No active or paused goals.</AppText> : null}
              </AppCard>

              <SectionHeader title="Completed goals" />
              <AppCard padding="none" style={styles.listCard}>
                {completedGoals.map((progress) => <GoalRow key={progress.goal.id} progress={progress} />)}
                {completedGoals.length === 0 ? <AppText style={styles.emptyText} tone="subtle">No completed goals yet.</AppText> : null}
              </AppCard>

              <SectionHeader title="Archived goals" />
              <AppCard padding="none" style={styles.listCard}>
                {archivedGoals.map((progress) => <GoalRow key={progress.goal.id} progress={progress} />)}
                {archivedGoals.length === 0 ? <AppText style={styles.emptyText} tone="subtle">No archived goals.</AppText> : null}
              </AppCard>
            </>
          ) : null}
        </>
      ) : null}
    </AppScreen>
  );
}

function GoalRow({ progress }: { progress: SavingsGoalProgress }) {
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
      <ProgressBar value={progress.progressPercent} tone={progress.isOverdue ? "danger" : progress.isAchieved ? "success" : "primary"} />
      <AppText tone="subtle" variant="caption">
        {formatMinorAsCurrency(progress.currentAmountMinor, progress.goal.currency)} saved of {formatMinorAsCurrency(progress.goal.targetMinor, progress.goal.currency)}. Need {formatMinorAsCurrency(progress.requiredMonthlyContributionMinor, progress.goal.currency)} monthly.
      </AppText>
      {progress.goal.linkedAccountId ? (
        <View style={styles.rowActions}>
          <AppButton
            onPress={() => router.push(`/transactions/new?type=transfer&mode=savings&destinationAccountId=${progress.goal.linkedAccountId}` as Href)}
            title="Add money"
            variant="secondary"
          />
          <AppButton
            onPress={() => router.push(`/transactions/new?type=transfer&sourceAccountId=${progress.goal.linkedAccountId}` as Href)}
            title="Withdraw"
            variant="ghost"
          />
        </View>
      ) : null}
    </Pressable>
  );
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "We couldn't load your savings. Please try again.";
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: theme.spacing.xxxl },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  actionCard: { gap: theme.spacing.md, marginBottom: theme.spacing.lg, ...theme.shadows.card },
  listCard: { marginBottom: theme.spacing.xl, ...theme.shadows.card },
  goalRow: { gap: theme.spacing.sm, padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSubtle },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: theme.spacing.md },
  rowCopy: { flex: 1, gap: theme.spacing.xxs },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  emptyText: { padding: theme.spacing.lg, textAlign: "center" },
});
