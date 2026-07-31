import { StyleSheet, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { dashboardMock, type DashboardMetric } from "@/src/features/insights/fixtures/dashboardMock";
import { theme } from "@/src/theme";
import { formatMinorUnitAmount } from "@/src/utils/formatMoney";

const metricToneMap: Record<NonNullable<DashboardMetric["tone"]>, { color: string; backgroundColor: string }> = {
  default: {
    color: theme.colors.text,
    backgroundColor: theme.colors.surfaceMuted,
  },
  success: {
    color: theme.colors.success,
    backgroundColor: theme.colors.successSurface,
  },
  danger: {
    color: theme.colors.danger,
    backgroundColor: theme.colors.dangerSurface,
  },
  warning: {
    color: theme.colors.warning,
    backgroundColor: theme.colors.warningSurface,
  },
};

export function DashboardOverview() {
  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <AppText tone="subtle" variant="label">
          Dashboard
        </AppText>
        <AppText variant="title">Financial overview</AppText>
      </View>

      <View style={styles.balanceCard}>
        <AppText tone="inverse" variant="caption">
          Total balance
        </AppText>
        <AppText tone="inverse" variant="headline">
          {formatMinorUnitAmount(dashboardMock.totalBalanceMinorUnits, dashboardMock.currency)}
        </AppText>
        <AppText style={styles.balanceCopy} tone="inverse" variant="caption">
          Mock data for layout only. Balances will be derived from transactions in a later phase.
        </AppText>
      </View>

      <View style={styles.metricGrid}>
        {dashboardMock.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="title">Recent transactions</AppText>
        <AppText tone="subtle" variant="caption">
          Static fixture
        </AppText>
      </View>

      <View style={styles.listCard}>
        {dashboardMock.recentTransactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionRow}>
            <View style={styles.transactionCopy}>
              <AppText variant="label">{transaction.title}</AppText>
              <AppText tone="subtle" variant="caption">
                {transaction.category} · {transaction.dateLabel}
              </AppText>
            </View>
            <AppText
              tone={transaction.valueMinorUnits >= 0 ? "success" : "default"}
              variant="label"
            >
              {formatMinorUnitAmount(transaction.valueMinorUnits, dashboardMock.currency)}
            </AppText>
          </View>
        ))}
      </View>
    </AppScreen>
  );
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const tone = metricToneMap[metric.tone ?? "default"];

  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricMarker, { backgroundColor: tone.backgroundColor }]}>
        <View style={[styles.metricDot, { backgroundColor: tone.color }]} />
      </View>
      <AppText tone="subtle" variant="caption">
        {metric.label}
      </AppText>
      <AppText style={{ color: tone.color }} variant="metric">
        {formatMinorUnitAmount(metric.valueMinorUnits, dashboardMock.currency)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing.xxs,
    marginBottom: theme.spacing.lg,
  },
  balanceCard: {
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    ...theme.shadows.card,
  },
  balanceCopy: {
    opacity: 0.78,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  metricCard: {
    width: "47%",
    minWidth: 150,
    flexGrow: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  metricMarker: {
    height: 28,
    width: 28,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  metricDot: {
    height: 10,
    width: 10,
    borderRadius: theme.radius.pill,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.md,
  },
  listCard: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  transactionCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
});
