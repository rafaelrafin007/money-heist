import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { MetricTile } from "@/src/components/MetricTile";
import { SectionHeader } from "@/src/components/SectionHeader";
import { useAccounts } from "@/src/features/accounts/api/accountsHooks";
import { useBudgetsForMonth } from "@/src/features/budgets/api/budgetsHooks";
import { useCategories } from "@/src/features/categories/api/categoriesHooks";
import { getRealDashboardOverview } from "@/src/features/finance/api/realFinanceSelectors";
import { InlineState } from "@/src/features/finance/components/InlineState";
import { getCurrentCalendarMonth } from "@/src/features/finance/dates";
import { formatMinorAsCurrency } from "@/src/features/finance/money";
import { useMonthlyFinancePlan } from "@/src/features/planning/api/monthlyFinancePlansHooks";
import { useSavingsGoals } from "@/src/features/savings/api/savingsGoalsHooks";
import { QuickEntryActions } from "@/src/features/transactions/components/QuickEntryActions";
import { useTransactions } from "@/src/features/transactions/api/transactionsHooks";
import { theme } from "@/src/theme";

export function DashboardOverview() {
  const range = getCurrentCalendarMonth();
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions();
  const budgets = useBudgetsForMonth(range.start);
  const goals = useSavingsGoals();
  const monthlyPlan = useMonthlyFinancePlan(range.start, "BDT");
  const isLoading = accounts.isLoading || categories.isLoading || transactions.isLoading || budgets.isLoading || goals.isLoading || monthlyPlan.isLoading;
  const error = accounts.error ?? categories.error ?? transactions.error ?? budgets.error ?? goals.error ?? monthlyPlan.error;
  const overview =
    accounts.data && categories.data && transactions.data && budgets.data && goals.data
      ? getRealDashboardOverview(accounts.data, categories.data, transactions.data, new Date(), {
          budgets: budgets.data,
          savingsGoals: goals.data,
          monthlyPlan: monthlyPlan.data ?? null,
        })
      : null;

  const metrics = overview
    ? [
        { label: "Income this month", valueMinor: overview.incomeMinor, tone: "success" as const },
        { label: "Expenses this month", valueMinor: -overview.expensesMinor, tone: "danger" as const },
        { label: "Net cash flow", valueMinor: overview.netCashFlowMinor, tone: overview.netCashFlowMinor >= 0 ? "success" as const : "danger" as const },
        { label: "Saved this month", valueMinor: overview.savedThisMonthMinor, tone: overview.savedThisMonthMinor >= 0 ? "success" as const : "danger" as const },
        { label: "Total savings", valueMinor: overview.totalSavingsMinor, tone: "success" as const },
        { label: "Net worth", valueMinor: overview.netWorthMinor, tone: overview.netWorthMinor >= 0 ? "default" as const : "danger" as const },
        { label: "Liabilities", valueMinor: -overview.totalLiabilitiesMinor, tone: "danger" as const },
      ]
    : [];

  return (
    <AppScreen scroll contentStyle={styles.screenContent}>
      <SectionHeader
        eyebrow={overview?.monthLabel ?? "Dashboard"}
        subtitle="A quick look at balances, cash flow, savings, and planning."
        title="Financial overview"
      />

      {isLoading ? <InlineState title="Loading dashboard" message="Getting your financial overview." /> : null}
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
          title="We couldn't load your dashboard"
        />
      ) : null}

      {overview && accounts.data?.length === 0 ? (
        <InlineState
          actionLabel="Create first account"
          message="Your totals are zero because you have not added accounts or transactions yet. Create your first account to start tracking your money."
          onAction={() => router.push("/accounts/new")}
          title="Welcome to Money Heist"
        />
      ) : null}

      {overview ? (
        <>
          <View style={styles.balanceCard}>
            <View style={styles.balanceTopRow}>
              <View style={styles.balanceIcon}>
                <Ionicons color={theme.colors.inverseText} name="wallet-outline" size={22} />
              </View>
              <AppText tone="inverse" variant="caption">{overview.monthLabel}</AppText>
            </View>
            <View style={styles.balanceCopyBlock}>
              <AppText tone="inverse" variant="caption">Liquid balance</AppText>
              <AppText tone="inverse" variant="headline">
                {formatMinorAsCurrency(overview.liquidBalanceMinor, overview.currency)}
              </AppText>
              <AppText style={styles.balanceCopy} tone="inverse" variant="caption">
                Available across your active accounts. Transfers are not counted as income or expenses.
              </AppText>
            </View>
          </View>

          <QuickEntryActions accounts={accounts.data ?? []} />

          <View style={styles.metricGrid}>
            {metrics.map((metric) => (
              <MetricTile
                key={metric.label}
                label={metric.label}
                tone={metric.tone}
                value={formatMinorAsCurrency(metric.valueMinor, overview.currency)}
              />
            ))}
          </View>

          <AppCard tone="warning" style={styles.forecastNote}>
            <View style={styles.sectionHeaderCompact}>
              <AppText tone="subtle" variant="label">
                Planning insights
              </AppText>
              <AppText tone="subtle" variant="caption">
                Budgets and goals
              </AppText>
            </View>
            <View style={styles.metricGridCompact}>
              <MetricTile label="Budget remaining" value={formatMinorAsCurrency(overview.budgetRemainingMinor, overview.currency)} />
              <MetricTile label="Daily allowance" value={formatMinorAsCurrency(overview.dailyBudgetAllowanceMinor, overview.currency)} />
              <MetricTile label="Potential savings" value={formatMinorAsCurrency(overview.potentialSavings.amountMinor, overview.currency)} tone={overview.potentialSavings.status === "complete" ? "success" : "warning"} />
              <MetricTile label="Goal monthly need" value={formatMinorAsCurrency(Math.max(0, ...overview.goalProgress.map((goal) => goal.requiredMonthlyContributionMinor)), overview.currency)} />
            </View>
            <AppText tone="subtle" variant="caption">
              Based on available cash, expected income, remaining budgets, upcoming expenses, debt obligations, and your safety buffer.
            </AppText>
            {overview.potentialSavings.status === "incomplete" ? (
              <AppText style={styles.warningText} variant="caption">
                Complete monthly planning assumptions to calculate potential savings.
              </AppText>
            ) : null}
            {overview.nearLimitBudgets.length || overview.exceededBudgets.length ? (
              <AppText style={overview.exceededBudgets.length ? styles.dangerText : styles.warningText} variant="caption">
                {overview.exceededBudgets.length} exceeded budget{overview.exceededBudgets.length === 1 ? "" : "s"} and {overview.nearLimitBudgets.length} near limit.
              </AppText>
            ) : null}
            <AppButton onPress={() => router.push("/planning" as Href)} title="Edit monthly plan" variant="secondary" />
          </AppCard>

          <SectionHeader eyebrow="Active only" title="Recent transactions" />

          <AppCard padding="none" style={styles.listCard}>
            {overview.recentTransactions.length === 0 ? (
              <AppText style={styles.emptyText} tone="subtle">
                No active transactions yet.
              </AppText>
            ) : (
              overview.recentTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionRow}>
                  <View style={styles.transactionIcon}>
                    <Ionicons color={transaction.type === "income" ? theme.colors.success : transaction.type === "expense" ? theme.colors.danger : theme.colors.primary} name={transaction.type === "income" ? "arrow-down-circle-outline" : transaction.type === "expense" ? "arrow-up-circle-outline" : "swap-horizontal-outline"} size={20} />
                  </View>
                  <View style={styles.transactionCopy}>
                    <AppText variant="label">{transaction.title}</AppText>
                    <AppText tone="subtle" variant="caption">
                      {transaction.detail} - {transaction.occurredAt}
                    </AppText>
                  </View>
                  <AppText tone={transaction.type === "income" ? "success" : transaction.type === "expense" ? "danger" : "default"} variant="label">
                    {formatTransactionAmount(transaction.type, transaction.amountMinor, transaction.currency)}
                  </AppText>
                </View>
              ))
            )}
          </AppCard>
        </>
      ) : null}
    </AppScreen>
  );
}

function formatTransactionAmount(type: string, amountMinor: number, currency: string) {
  if (type === "income") return `+${formatMinorAsCurrency(amountMinor, currency)}`;
  if (type === "expense") return formatMinorAsCurrency(-amountMinor, currency);
  return formatMinorAsCurrency(amountMinor, currency);
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "We couldn't load your dashboard. Please try again.";
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: theme.spacing.xxxl },
  balanceCard: {
    gap: theme.spacing.xl,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  balanceTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md },
  balanceIcon: { height: 42, width: 42, borderRadius: theme.radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)" },
  balanceCopyBlock: { gap: theme.spacing.sm },
  balanceCopy: { opacity: 0.78 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  forecastNote: { gap: theme.spacing.md, marginBottom: theme.spacing.xl },
  sectionHeaderCompact: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: theme.spacing.md },
  metricGridCompact: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md, marginTop: theme.spacing.sm },
  warningText: { color: theme.colors.warning },
  dangerText: { color: theme.colors.danger },
  listCard: { marginTop: -theme.spacing.sm, ...theme.shadows.card },
  transactionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md, padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSubtle },
  transactionIcon: { height: 36, width: 36, borderRadius: theme.radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceMuted },
  transactionCopy: { flex: 1, gap: theme.spacing.xxs },
  emptyText: { padding: theme.spacing.lg, textAlign: "center" },
});
