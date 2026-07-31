import { StyleSheet, View, type DimensionValue } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { useBudgetsOverview } from "@/src/features/finance/hooks";
import { formatMinorAsCurrency } from "@/src/features/finance/money";
import type { BudgetSummary } from "@/src/features/finance/calculations";
import { theme } from "@/src/theme";

export function BudgetsScreen() {
  const overview = useBudgetsOverview();

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <AppText tone="subtle" variant="label">
          Calendar month
        </AppText>
        <AppText variant="title">Budgets</AppText>
      </View>

      <View style={styles.list}>
        {overview.budgets.map((budget) => (
          <BudgetCard key={budget.budget.id} budget={budget} />
        ))}
      </View>
    </AppScreen>
  );
}

function BudgetCard({ budget }: { budget: BudgetSummary }) {
  const statusColor =
    budget.status === "exceeded"
      ? theme.colors.danger
      : budget.status === "warning"
        ? theme.colors.warning
        : theme.colors.success;
  const progressWidth: DimensionValue = `${Math.min(100, budget.utilizationPercent)}%`;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <AppText variant="label">{budget.category.name}</AppText>
          <AppText tone="subtle" variant="caption">
            {budget.status === "exceeded" ? "Exceeded" : budget.status === "warning" ? "Warning" : "Safe"}
          </AppText>
        </View>
        <AppText variant="label">{budget.utilizationPercent}%</AppText>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progressWidth, backgroundColor: statusColor }]} />
      </View>

      <View style={styles.amountGrid}>
        <AmountLabel label="Limit" value={formatMinorAsCurrency(budget.budget.limitMinor, budget.budget.currency)} />
        <AmountLabel label="Spent" value={formatMinorAsCurrency(-budget.spentMinor, budget.budget.currency)} />
        <AmountLabel
          label={budget.isExceeded ? "Overspent" : "Remaining"}
          value={formatMinorAsCurrency(
            budget.isExceeded ? -budget.overspentMinor : budget.remainingMinor,
            budget.budget.currency,
          )}
        />
      </View>
    </View>
  );
}

function AmountLabel({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.amountLabel}>
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
  list: {
    gap: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.md,
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
  },
  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  amountLabel: {
    minWidth: 130,
    flex: 1,
    gap: theme.spacing.xxs,
  },
});
