import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { AppChip } from "@/src/components/AppChip";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { AppTextInput } from "@/src/components/AppTextInput";
import { MetricTile } from "@/src/components/MetricTile";
import { SectionHeader } from "@/src/components/SectionHeader";
import { useAccounts } from "@/src/features/accounts/api/accountsHooks";
import { useCategories } from "@/src/features/categories/api/categoriesHooks";
import { buildFinanceDataset, getTransactionViews } from "@/src/features/finance/api/realFinanceSelectors";
import { InlineState } from "@/src/features/finance/components/InlineState";
import { getCurrentCalendarMonth, toIsoDate } from "@/src/features/finance/dates";
import { formatMinorAsCurrency } from "@/src/features/finance/money";
import type { TransactionView } from "@/src/features/finance/api/realFinanceSelectors";
import type { Transaction } from "@/src/features/finance/types";
import { QuickEntryActions } from "@/src/features/transactions/components/QuickEntryActions";
import {
  getThisMonthTransactionSummary,
  getTodayTransactionSummary,
  groupTransactionsByCalendarDate,
  type TransactionPeriodSummary,
} from "@/src/features/transactions/transactionSelectors";
import { useTransactions } from "@/src/features/transactions/api/transactionsHooks";
import { theme } from "@/src/theme";

type TransactionFilter = "all" | Transaction["type"];
type StatusFilter = "active" | "cancelled" | "all";
type PeriodFilter = "today" | "month" | "all";

const filters: { label: string; value: TransactionFilter }[] = [
  { label: "All", value: "all" },
  { label: "Income", value: "income" },
  { label: "Expense", value: "expense" },
  { label: "Transfer", value: "transfer" },
];

export function TransactionsScreen() {
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions();
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("today");
  const [search, setSearch] = useState("");
  const isLoading = accounts.isLoading || categories.isLoading || transactions.isLoading;
  const error = accounts.error ?? categories.error ?? transactions.error;
  const dataset = useMemo(
    () => buildFinanceDataset(accounts.data ?? [], categories.data ?? [], transactions.data ?? []),
    [accounts.data, categories.data, transactions.data],
  );
  const todaySummary = useMemo(() => getTodayTransactionSummary(dataset), [dataset]);
  const monthSummary = useMemo(() => getThisMonthTransactionSummary(dataset), [dataset]);
  const activeSummary = periodFilter === "today" ? todaySummary : monthSummary;

  const transactionViews = useMemo(
    () => getTransactionViews(transactions.data ?? [], accounts.data ?? [], categories.data ?? []),
    [accounts.data, categories.data, transactions.data],
  );

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return transactionViews.filter((transaction) => {
      const matchesType = filter === "all" || transaction.type === filter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? transaction.status === "active" : transaction.status === "cancelled");
      const matchesPeriod =
        periodFilter === "all" ||
        (periodFilter === "today" && transaction.occurredAt === toIsoDate(new Date())) ||
        (periodFilter === "month" &&
          transaction.occurredAt >= getCurrentCalendarMonth().start &&
          transaction.occurredAt <= getCurrentCalendarMonth().end);
      const matchesSearch =
        !normalizedSearch ||
        transaction.title.toLowerCase().includes(normalizedSearch) ||
        transaction.detail.toLowerCase().includes(normalizedSearch);
      return matchesType && matchesStatus && matchesPeriod && matchesSearch;
    });
  }, [filter, periodFilter, search, statusFilter, transactionViews]);
  const filteredTransactionRows = useMemo(
    () => (transactions.data ?? []).filter((transaction) => filteredTransactions.some((view) => view.id === transaction.id)),
    [filteredTransactions, transactions.data],
  );
  const groupedTransactions = useMemo(
    () => groupTransactionsByCalendarDate(dataset, filteredTransactionRows),
    [dataset, filteredTransactionRows],
  );
  const viewsById = useMemo(() => new Map(transactionViews.map((transaction) => [transaction.id, transaction])), [transactionViews]);

  return (
    <AppScreen scroll contentStyle={styles.screenContent}>
      <SectionHeader
        action={<AppButton onPress={() => router.push("/transactions/new")} title="Add" />}
        eyebrow="Money in and out"
        subtitle="Review daily activity, filter movement, and keep your cash flow clear."
        title="Transactions"
      />

      {isLoading ? <InlineState title="Loading transactions" message="Getting your recent activity." /> : null}
      {error ? (
        <InlineState
          actionLabel="Retry"
          message={getMessage(error)}
          onAction={() => {
            void accounts.refetch();
            void categories.refetch();
            void transactions.refetch();
          }}
          title="We couldn't load your transactions"
        />
      ) : null}

      {!isLoading && !error ? (
        <>
          <QuickEntryActions accounts={accounts.data ?? []} title="Add money movement" />

          <AppCard padding="md" style={styles.controlCard}>
            <View style={styles.filterHeader}>
              <AppText variant="label">View</AppText>
              <AppText tone="subtle" variant="caption">{filteredTransactions.length} shown</AppText>
            </View>
            <View style={styles.periodFilters}>
              <AppChip active={periodFilter === "today"} label="Today" onPress={() => setPeriodFilter("today")} />
              <AppChip active={periodFilter === "month"} label="This month" onPress={() => setPeriodFilter("month")} />
              <AppChip active={periodFilter === "all"} label="All" onPress={() => setPeriodFilter("all")} />
            </View>
          </AppCard>

          {periodFilter !== "all" ? (
            <TransactionSummaryCards
              currency={dataset.currency}
              label={periodFilter === "today" ? "Today" : "This month"}
              summary={activeSummary}
            />
          ) : null}

          <AppCard padding="md" style={styles.controlCard}>
            <AppTextInput
              autoCapitalize="none"
              label="Search transactions"
              onChangeText={setSearch}
              placeholder="Search by category, account or note"
              value={search}
            />

            <View style={styles.filters}>
              {filters.map((item) => (
                <AppChip
                  key={item.value}
                  active={filter === item.value}
                  label={item.label}
                  onPress={() => setFilter(item.value)}
                  tone={item.value === "income" ? "success" : item.value === "expense" ? "danger" : "default"}
                />
              ))}
            </View>
            <View style={styles.filters}>
              <AppChip active={statusFilter === "active"} label="Active" onPress={() => setStatusFilter("active")} />
              <AppChip active={statusFilter === "cancelled"} label="Cancelled" onPress={() => setStatusFilter("cancelled")} tone="danger" />
              <AppChip active={statusFilter === "all"} label="All status" onPress={() => setStatusFilter("all")} />
            </View>
          </AppCard>

          {transactionViews.length === 0 ? (
            <AppCard style={styles.firstUseCard}>
              <AppText variant="label">Start your ledger</AppText>
              <AppText tone="subtle" variant="caption">
                Add income, record an expense, or move money into savings.
              </AppText>
              <AppButton onPress={() => router.push("/transactions/new?type=income" as Href)} title="Add your first income" />
              <AppButton onPress={() => router.push("/transactions/new?type=expense" as Href)} title="Record your first expense" variant="secondary" />
              <AppButton onPress={() => router.push("/transactions/new?type=transfer&mode=savings" as Href)} title="Transfer money into savings" variant="secondary" />
            </AppCard>
          ) : null}

          {filteredTransactions.length === 0 && transactionViews.length > 0 ? (
            <InlineState title="No matching transactions" message="Try another period, status, type, or search term." />
          ) : null}

          <View style={styles.groupList}>
            {groupedTransactions.map((group) => (
            <AppCard key={group.date} padding="none" style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View style={styles.groupHeaderCopy}>
                  <AppText variant="label">{group.label}</AppText>
                  <AppText tone="subtle" variant="caption">{group.date}</AppText>
                </View>
                <View style={styles.groupPills}>
                  <DailyPill label="In" value={formatMinorAsCurrency(group.summary.incomeMinor, dataset.currency)} tone="success" />
                  <DailyPill label="Out" value={formatMinorAsCurrency(group.summary.expensesMinor, dataset.currency)} tone="danger" />
                  <DailyPill label="Net" value={formatMinorAsCurrency(group.summary.netCashFlowMinor, dataset.currency)} />
                </View>
              </View>
              {group.transactions.map((transaction) => {
                const view = viewsById.get(transaction.id);
                return view ? <TransactionRow key={transaction.id} transaction={view} /> : null;
              })}
            </AppCard>
            ))}
          </View>
        </>
      ) : null}
    </AppScreen>
  );
}

function TransactionSummaryCards({ label, summary, currency }: { label: string; summary: TransactionPeriodSummary; currency: string }) {
  return (
    <View style={styles.summaryGrid}>
      <MetricTile label={`${label} income`} value={formatMinorAsCurrency(summary.incomeMinor, currency)} tone="success" />
      <MetricTile label={`${label} expenses`} value={formatMinorAsCurrency(-summary.expensesMinor, currency)} tone="danger" />
      <MetricTile label={`${label} net cash flow`} value={formatMinorAsCurrency(summary.netCashFlowMinor, currency)} tone={summary.netCashFlowMinor >= 0 ? "success" : "danger"} />
      <MetricTile label={`${label} saved`} value={formatMinorAsCurrency(summary.savedMinor, currency)} tone={summary.savedMinor >= 0 ? "success" : "danger"} />
      <MetricTile label="Transactions" value={`${summary.activeTransactionCount}`} tone="primary" />
    </View>
  );
}

function DailyPill({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "danger" }) {
  return (
    <View style={styles.dailyPill}>
      <AppText tone="subtle" variant="caption">{label}</AppText>
      <AppText tone={tone} variant="caption">{value}</AppText>
    </View>
  );
}

function TransactionRow({ transaction }: { transaction: TransactionView }) {
  const tone = transaction.type === "income" ? "success" : transaction.type === "expense" ? "danger" : "default";
  const visual = getTransactionVisual(transaction);

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/transactions/${transaction.id}` as Href)} style={styles.transactionRow}>
      <View style={[styles.typeIcon, { backgroundColor: visual.surface }]}>
        <Ionicons color={visual.color} name={visual.icon} size={20} />
      </View>
      <View style={styles.transactionCopy}>
        <View style={styles.transactionTitleRow}>
          <AppText style={styles.transactionTitle} variant="label">{transaction.title}</AppText>
          {transaction.status === "cancelled" ? (
            <View style={styles.statusBadge}>
              <AppText tone="danger" variant="caption">Cancelled</AppText>
            </View>
          ) : null}
        </View>
        <AppText tone="subtle" variant="caption">
          {transaction.detail}
        </AppText>
      </View>
      <AppText tone={tone} variant="label">
        {formatTransactionAmount(transaction)}
      </AppText>
    </Pressable>
  );
}

function formatTransactionAmount(transaction: TransactionView) {
  if (transaction.type === "income") return `+${formatMinorAsCurrency(transaction.amountMinor, transaction.currency)}`;
  if (transaction.type === "expense") return formatMinorAsCurrency(-transaction.amountMinor, transaction.currency);
  return formatMinorAsCurrency(transaction.amountMinor, transaction.currency);
}

function getTransactionVisual(transaction: TransactionView) {
  if (transaction.type === "income") {
    return { icon: "arrow-down-circle-outline" as const, color: theme.colors.success, surface: theme.colors.successSurface };
  }

  if (transaction.type === "expense") {
    return { icon: "arrow-up-circle-outline" as const, color: theme.colors.danger, surface: theme.colors.dangerSurface };
  }

  return {
    icon: transaction.destinationAccountName?.toLowerCase().includes("savings") ? "shield-checkmark-outline" as const : "swap-horizontal-outline" as const,
    color: theme.colors.primary,
    surface: theme.colors.surfaceTint,
  };
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "We couldn't load your transactions. Please try again.";
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: theme.spacing.xxxl,
  },
  controlCard: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  periodFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  firstUseCard: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  groupList: {
    gap: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  groupCard: {
    ...theme.shadows.card,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceMuted,
  },
  groupHeaderCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  groupPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: theme.spacing.xs,
    maxWidth: "58%",
  },
  dailyPill: {
    gap: 2,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  transactionCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  transactionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  transactionTitle: {
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.dangerSurface,
  },
  typeIcon: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
