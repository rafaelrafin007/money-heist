import { StyleSheet, View } from "react-native";

import { AppCard } from "@/src/components/AppCard";
import { AppText } from "@/src/components/AppText";
import { ProgressBar } from "@/src/components/ProgressBar";
import { formatMinorAsCurrency } from "@/src/features/finance/money";
import type {
  BudgetHealthSummary,
  CashFlowMonth,
  ExpenseCategorySlice,
  FinanceInsight,
  SavingsTrendMonth,
} from "@/src/features/insights/insightSelectors";
import { theme } from "@/src/theme";

type CashFlowChartProps = {
  data: CashFlowMonth[];
};

export function CashFlowChart({ data }: CashFlowChartProps) {
  const maxValue = Math.max(1, ...data.flatMap((month) => [month.incomeMinor, month.expensesMinor]));
  const hasData = data.some((month) => month.incomeMinor > 0 || month.expensesMinor > 0);
  const currency = data[0]?.currency ?? "BDT";

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <AppText variant="label">Cash flow</AppText>
        <AppText tone="subtle" variant="caption">Income and expenses by month</AppText>
      </View>
      {!hasData ? (
        <EmptyChartCopy message="Add income and expenses to see monthly cash flow." />
      ) : (
        <View
          accessibilityLabel={`Cash flow chart for ${data.length} months in ${currency}. Income and expenses are shown separately.`}
          accessible
          style={styles.cashFlowRows}
        >
          {data.map((month) => (
            <View key={month.monthStart} style={styles.cashFlowRow}>
              <AppText style={styles.monthLabel} tone="subtle" variant="caption">{month.label}</AppText>
              <View style={styles.seriesColumn}>
                <ChartBar
                  color={theme.colors.success}
                  label="Income"
                  valueMinor={month.incomeMinor}
                  widthPercent={(month.incomeMinor / maxValue) * 100}
                  currency={month.currency}
                />
                <ChartBar
                  color={theme.colors.danger}
                  label="Expenses"
                  valueMinor={month.expensesMinor}
                  widthPercent={(month.expensesMinor / maxValue) * 100}
                  currency={month.currency}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </AppCard>
  );
}

export function ExpenseCategoryChart({ data }: { data: ExpenseCategorySlice[] }) {
  const maxValue = Math.max(1, ...data.map((item) => item.amountMinor));

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <AppText variant="label">Spending by category</AppText>
        <AppText tone="subtle" variant="caption">Top expense categories this month</AppText>
      </View>
      {data.length === 0 ? (
        <EmptyChartCopy message="No expenses recorded for this month." />
      ) : (
        <View accessible accessibilityLabel="Spending by category chart. Each row includes category, amount, and share of expenses." style={styles.categoryList}>
          {data.map((item) => (
            <View key={item.categoryId} style={styles.categoryRow}>
              <View style={styles.categoryCopy}>
                <AppText variant="label">{item.categoryName}</AppText>
                <AppText tone="subtle" variant="caption">
                  {item.percentage}% of expenses
                </AppText>
              </View>
              <View style={styles.categoryBarColumn}>
                <View style={styles.track}>
                  <View style={[styles.categoryFill, { width: `${Math.max(3, (item.amountMinor / maxValue) * 100)}%` }]} />
                </View>
                <AppText tone="danger" variant="caption">
                  {formatMinorAsCurrency(-item.amountMinor, item.currency)}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      )}
    </AppCard>
  );
}

export function SavingsTrendChart({ data }: { data: SavingsTrendMonth[] }) {
  const maxValue = Math.max(1, ...data.map((month) => Math.abs(month.savedMinor)));
  const hasData = data.some((month) => month.savedMinor !== 0);

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <AppText variant="label">Savings trend</AppText>
        <AppText tone="subtle" variant="caption">Net transfers into savings by month</AppText>
      </View>
      {!hasData ? (
        <EmptyChartCopy message="Move money into a savings account to see the trend." />
      ) : (
        <View accessible accessibilityLabel="Savings trend chart showing net savings transfers by month." style={styles.savingsRows}>
          {data.map((month) => (
            <View key={month.monthStart} style={styles.savingsRow}>
              <AppText style={styles.monthLabel} tone="subtle" variant="caption">{month.label}</AppText>
              <View style={styles.savingsBarColumn}>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.savingsFill,
                      month.savedMinor < 0 ? styles.negativeSavingsFill : null,
                      { width: `${Math.max(3, (Math.abs(month.savedMinor) / maxValue) * 100)}%` },
                    ]}
                  />
                </View>
                <AppText tone={month.savedMinor >= 0 ? "success" : "danger"} variant="caption">
                  {formatMinorAsCurrency(month.savedMinor, month.currency)}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      )}
    </AppCard>
  );
}

export function BudgetHealthCard({ summary }: { summary: BudgetHealthSummary }) {
  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <AppText variant="label">Budget health</AppText>
        <AppText tone="subtle" variant="caption">
          {summary.nearLimitCount} near limit, {summary.exceededCount} exceeded
        </AppText>
      </View>
      {summary.rankedBudgets.length === 0 ? (
        <EmptyChartCopy message="Create budgets to see budget health." />
      ) : (
        <View style={styles.budgetRows}>
          {summary.rankedBudgets.slice(0, 5).map((budget) => (
            <View key={budget.budgetId} style={styles.budgetRow}>
              <View style={styles.categoryCopy}>
                <AppText variant="label">{budget.categoryName}</AppText>
                <AppText tone={budget.status === "exceeded" ? "danger" : budget.status === "warning" ? "subtle" : "success"} variant="caption">
                  {budget.status === "safe" ? "Safe" : budget.status === "warning" ? "Warning" : "Exceeded"} - {budget.utilizationPercent}% used
                </AppText>
              </View>
              <ProgressBar value={budget.utilizationPercent} tone={budget.status === "exceeded" ? "danger" : budget.status === "warning" ? "warning" : "success"} />
            </View>
          ))}
        </View>
      )}
    </AppCard>
  );
}

export function InsightList({ insights, limit }: { insights: FinanceInsight[]; limit?: number }) {
  const visibleInsights = typeof limit === "number" ? insights.slice(0, limit) : insights;
  const markerStyles = {
    default: styles.defaultMarker,
    success: styles.successMarker,
    warning: styles.warningMarker,
    danger: styles.dangerMarker,
  };

  return (
    <AppCard padding="none" style={styles.insightCard}>
      {visibleInsights.map((insight) => (
        <View key={insight.id} style={styles.insightRow}>
          <View style={[styles.insightMarker, markerStyles[insight.tone]]} />
          <View style={styles.insightCopy}>
            <AppText variant="label">{insight.title}</AppText>
            <AppText tone="subtle" variant="caption">{insight.detail}</AppText>
          </View>
        </View>
      ))}
    </AppCard>
  );
}

function ChartBar({
  label,
  valueMinor,
  widthPercent,
  color,
  currency,
}: {
  label: string;
  valueMinor: number;
  widthPercent: number;
  color: string;
  currency: string;
}) {
  return (
    <View style={styles.barRow}>
      <AppText style={styles.seriesLabel} tone="subtle" variant="caption">{label}</AppText>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(3, widthPercent)}%`, backgroundColor: color }]} />
      </View>
      <AppText style={styles.amountLabel} variant="caption">{formatMinorAsCurrency(valueMinor, currency)}</AppText>
    </View>
  );
}

function EmptyChartCopy({ message }: { message: string }) {
  return (
    <View style={styles.emptyState}>
      <AppText tone="subtle" variant="caption">{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  header: {
    gap: theme.spacing.xxs,
  },
  cashFlowRows: {
    gap: theme.spacing.md,
  },
  cashFlowRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    alignItems: "center",
  },
  monthLabel: {
    width: 58,
  },
  seriesColumn: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  seriesLabel: {
    width: 58,
  },
  amountLabel: {
    width: 92,
    textAlign: "right",
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: theme.radius.pill,
  },
  categoryList: {
    gap: theme.spacing.md,
  },
  categoryRow: {
    gap: theme.spacing.sm,
  },
  categoryCopy: {
    gap: theme.spacing.xxs,
  },
  categoryBarColumn: {
    gap: theme.spacing.xs,
  },
  categoryFill: {
    height: "100%",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.danger,
  },
  savingsRows: {
    gap: theme.spacing.md,
  },
  savingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  savingsBarColumn: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  savingsFill: {
    height: "100%",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.success,
  },
  negativeSavingsFill: {
    backgroundColor: theme.colors.danger,
  },
  budgetRows: {
    gap: theme.spacing.md,
  },
  budgetRow: {
    gap: theme.spacing.sm,
  },
  insightCard: {
    ...theme.shadows.card,
  },
  insightRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  insightMarker: {
    width: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary,
  },
  defaultMarker: {
    backgroundColor: theme.colors.primary,
  },
  successMarker: {
    backgroundColor: theme.colors.success,
  },
  warningMarker: {
    backgroundColor: theme.colors.warning,
  },
  dangerMarker: {
    backgroundColor: theme.colors.danger,
  },
  insightCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  emptyState: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
  },
});
