import { StyleSheet, View, type DimensionValue } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import type { SavingsGoalProgress } from "@/src/features/finance/calculations";
import { useSavingsOverview } from "@/src/features/finance/hooks";
import { formatMinorAsCurrency } from "@/src/features/finance/money";
import { theme } from "@/src/theme";

export function SavingsScreen() {
  const overview = useSavingsOverview();

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <AppText tone="subtle" variant="label">
          Savings
        </AppText>
        <AppText variant="title">Goals and safe savings</AppText>
      </View>

      <View style={styles.summaryGrid}>
        <SummaryCard label="Total savings" value={formatMinorAsCurrency(overview.totalSavingsMinor, overview.currency)} />
        <SummaryCard label="Saved this month" value={formatMinorAsCurrency(overview.savedThisMonthMinor, overview.currency)} />
        <SummaryCard
          label="Potential savings estimate"
          value={formatMinorAsCurrency(overview.potentialSavings.amountMinor, overview.currency)}
        />
      </View>

      <View style={styles.forecastNote}>
        <AppText tone="subtle" variant="caption">
          Potential savings is a forecast, not guaranteed savings.
        </AppText>
      </View>

      <View style={styles.goalList}>
        {overview.goals.map((goal) => (
          <GoalCard key={goal.goal.id} goal={goal} />
        ))}
      </View>
    </AppScreen>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <AppText tone="subtle" variant="caption">
        {label}
      </AppText>
      <AppText variant="metric">{value}</AppText>
    </View>
  );
}

function GoalCard({ goal }: { goal: SavingsGoalProgress }) {
  const progressWidth: DimensionValue = `${goal.progressPercent}%`;

  return (
    <View style={styles.goalCard}>
      <View style={styles.goalHeader}>
        <View style={styles.goalTitle}>
          <AppText variant="label">{goal.goal.name}</AppText>
          <AppText tone={goal.isOverdue ? "danger" : "subtle"} variant="caption">
            {goal.isAchieved ? "Target achieved" : goal.isOverdue ? "Overdue" : `Target: ${goal.goal.targetDate ?? "No date"}`}
          </AppText>
        </View>
        <AppText variant="label">{goal.progressPercent}%</AppText>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      <View style={styles.goalAmounts}>
        <AmountLine label="Current" value={formatMinorAsCurrency(goal.currentAmountMinor, goal.goal.currency)} />
        <AmountLine label="Remaining" value={formatMinorAsCurrency(goal.remainingMinor, goal.goal.currency)} />
        <AmountLine
          label="Monthly needed"
          value={formatMinorAsCurrency(goal.requiredMonthlyContributionMinor, goal.goal.currency)}
        />
      </View>
    </View>
  );
}

function AmountLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.amountLine}>
      <AppText tone="subtle" variant="caption">
        {label}
      </AppText>
      <AppText variant="label">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing.xxs,
    marginBottom: theme.spacing.lg,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  summaryCard: {
    minWidth: 160,
    flex: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  forecastNote: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.warningSurface,
  },
  goalList: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  goalCard: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  goalTitle: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  progressTrack: {
    height: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.success,
  },
  goalAmounts: {
    gap: theme.spacing.sm,
  },
  amountLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
});
