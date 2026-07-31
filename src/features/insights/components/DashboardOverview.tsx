import { StyleSheet, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { useDashboardOverview } from "@/src/features/finance/hooks";
import { theme } from "@/src/theme";
import { formatMinorAsCurrency } from "@/src/features/finance/money";

type MetricTone = "default" | "success" | "danger" | "warning";

const metricToneMap: Record<MetricTone, { color: string; backgroundColor: string }> = {
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
  const overview = useDashboardOverview();
  const metrics = [
    { label: "Income this month", valueMinor: overview.incomeMinor, tone: "success" as const },
    { label: "Expenses this month", valueMinor: overview.expensesMinor, tone: "danger" as const, invert: true },
    { label: "Net cash flow", valueMinor: overview.netCashFlowMinor, tone: overview.netCashFlowMinor >= 0 ? "success" as const : "danger" as const },
    { label: "Saved this month", valueMinor: overview.savedThisMonthMinor, tone: overview.savedThisMonthMinor >= 0 ? "success" as const : "danger" as const },
    { label: "Total savings", valueMinor: overview.totalSavingsMinor, tone: "success" as const },
    { label: "Potential savings", valueMinor: overview.potentialSavings.amountMinor, tone: "warning" as const },
    { label: "Net worth", valueMinor: overview.netWorthMinor, tone: overview.netWorthMinor >= 0 ? "default" as const : "danger" as const },
    { label: "Liabilities", valueMinor: overview.totalLiabilitiesMinor, tone: "danger" as const, invert: true },
  ];

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <AppText tone="subtle" variant="label">
          {overview.monthLabel} - authenticated demo data
        </AppText>
        <AppText variant="title">Financial overview</AppText>
      </View>

      <View style={styles.balanceCard}>
        <AppText tone="inverse" variant="caption">
          Liquid balance
        </AppText>
        <AppText tone="inverse" variant="headline">
          {formatMinorAsCurrency(overview.liquidBalanceMinor, overview.currency)}
        </AppText>
        <AppText style={styles.balanceCopy} tone="inverse" variant="caption">
          Calculated from active demo transactions and opening balances. Credit cards and loans are
          handled as liabilities for net worth.
        </AppText>
      </View>

      <View style={styles.metricGrid}>
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </View>

      <View style={styles.forecastNote}>
        <AppText tone="subtle" variant="label">
          Forecast estimate
        </AppText>
        <AppText tone="subtle" variant="caption">
          Potential savings is based on available cash, expected income, upcoming obligations,
          remaining budget and safety buffer.
        </AppText>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="title">Recent transactions</AppText>
        <AppText tone="subtle" variant="caption">
          Demo data
        </AppText>
      </View>

      <View style={styles.listCard}>
        {overview.recentTransactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionRow}>
            <View style={styles.transactionCopy}>
              <AppText variant="label">{transaction.title}</AppText>
              <AppText tone="subtle" variant="caption">
                {transaction.detail} - {transaction.occurredAt}
              </AppText>
            </View>
            <AppText
              tone={transaction.type === "income" ? "success" : transaction.type === "expense" ? "danger" : "default"}
              variant="label"
            >
              {formatTransactionAmount(transaction.type, transaction.amountMinor, transaction.currency)}
            </AppText>
          </View>
        ))}
      </View>
    </AppScreen>
  );
}

function MetricCard({
  metric,
}: {
  metric: { label: string; valueMinor: number; tone: MetricTone; invert?: boolean };
}) {
  const tone = metricToneMap[metric.tone];
  const displayValue = metric.invert ? -metric.valueMinor : metric.valueMinor;

  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricMarker, { backgroundColor: tone.backgroundColor }]}>
        <View style={[styles.metricDot, { backgroundColor: tone.color }]} />
      </View>
      <AppText tone="subtle" variant="caption">
        {metric.label}
      </AppText>
      <AppText style={{ color: tone.color }} variant="metric">
        {formatMinorAsCurrency(displayValue)}
      </AppText>
    </View>
  );
}

function formatTransactionAmount(type: string, amountMinor: number, currency: string) {
  if (type === "income") {
    return `+${formatMinorAsCurrency(amountMinor, currency)}`;
  }

  if (type === "expense") {
    return formatMinorAsCurrency(-amountMinor, currency);
  }

  return formatMinorAsCurrency(amountMinor, currency);
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
  forecastNote: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.warningSurface,
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
