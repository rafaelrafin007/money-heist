import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { AppTextInput } from "@/src/components/AppTextInput";
import { useAccounts } from "@/src/features/accounts/api/accountsHooks";
import { useCategories } from "@/src/features/categories/api/categoriesHooks";
import { buildFinanceDataset, getTransactionViews } from "@/src/features/finance/api/realFinanceSelectors";
import { InlineState } from "@/src/features/finance/components/InlineState";
import { getCurrentCalendarMonth, toIsoDate } from "@/src/features/finance/dates";
import { formatMinorAsCurrency } from "@/src/features/finance/money";
import type { TransactionView } from "@/src/features/finance/selectors";
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
    <AppScreen scroll>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText tone="subtle" variant="label">
            Real Supabase data
          </AppText>
          <AppText variant="title">Transactions</AppText>
        </View>
        <AppButton onPress={() => router.push("/transactions/new")} title="Add" />
      </View>

      {isLoading ? <InlineState title="Loading transactions" message="Fetching your authenticated ledger." /> : null}
      {error ? (
        <InlineState
          actionLabel="Retry"
          message={getMessage(error)}
          onAction={() => {
            void accounts.refetch();
            void categories.refetch();
            void transactions.refetch();
          }}
          title="Transactions unavailable"
        />
      ) : null}

      {!isLoading && !error ? (
        <>
          <QuickEntryActions accounts={accounts.data ?? []} title="Add money movement" />

          <View style={styles.periodFilters}>
            <Chip active={periodFilter === "today"} label="Today" onPress={() => setPeriodFilter("today")} />
            <Chip active={periodFilter === "month"} label="This month" onPress={() => setPeriodFilter("month")} />
            <Chip active={periodFilter === "all"} label="All transactions" onPress={() => setPeriodFilter("all")} />
          </View>

          {periodFilter !== "all" ? (
            <TransactionSummaryCards
              currency={dataset.currency}
              label={periodFilter === "today" ? "Today" : "This month"}
              summary={activeSummary}
            />
          ) : null}

          <AppTextInput
            autoCapitalize="none"
            label="Search transactions"
            onChangeText={setSearch}
            placeholder="Search by category, account or note"
            value={search}
          />

          <View style={styles.filters}>
            {filters.map((item) => (
              <Chip key={item.value} active={filter === item.value} label={item.label} onPress={() => setFilter(item.value)} />
            ))}
          </View>
          <View style={styles.filters}>
            <Chip active={statusFilter === "active"} label="Active" onPress={() => setStatusFilter("active")} />
            <Chip active={statusFilter === "cancelled"} label="Cancelled" onPress={() => setStatusFilter("cancelled")} />
            <Chip active={statusFilter === "all"} label="All status" onPress={() => setStatusFilter("all")} />
          </View>

          {transactionViews.length === 0 ? (
            <View style={styles.firstUseCard}>
              <AppText variant="label">Start your ledger</AppText>
              <AppText tone="subtle" variant="caption">
                Add income, record expenses, or transfer money into savings. These are real Supabase records.
              </AppText>
              <AppButton onPress={() => router.push("/transactions/new?type=income" as Href)} title="Add your first income" />
              <AppButton onPress={() => router.push("/transactions/new?type=expense" as Href)} title="Record your first expense" variant="secondary" />
              <AppButton onPress={() => router.push("/transactions/new?type=transfer&mode=savings" as Href)} title="Transfer money into savings" variant="secondary" />
            </View>
          ) : null}

          {filteredTransactions.length === 0 && transactionViews.length > 0 ? (
            <InlineState title="No matching transactions" message="Try another period, status, type, or search term." />
          ) : null}

          {groupedTransactions.map((group) => (
            <View key={group.date} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <AppText variant="label">{group.label}</AppText>
                <AppText tone="subtle" variant="caption">
                  Income {formatMinorAsCurrency(group.summary.incomeMinor, dataset.currency)} - Expenses {formatMinorAsCurrency(group.summary.expensesMinor, dataset.currency)} - Net {formatMinorAsCurrency(group.summary.netCashFlowMinor, dataset.currency)}
                </AppText>
              </View>
              {group.transactions.map((transaction) => {
                const view = viewsById.get(transaction.id);
                return view ? <TransactionRow key={transaction.id} transaction={view} /> : null;
              })}
            </View>
          ))}
        </>
      ) : null}
    </AppScreen>
  );
}

function TransactionSummaryCards({ label, summary, currency }: { label: string; summary: TransactionPeriodSummary; currency: string }) {
  return (
    <View style={styles.summaryGrid}>
      <SummaryCard label={`${label} income`} value={formatMinorAsCurrency(summary.incomeMinor, currency)} tone="success" />
      <SummaryCard label={`${label} expenses`} value={formatMinorAsCurrency(-summary.expensesMinor, currency)} tone="danger" />
      <SummaryCard label={`${label} net cash flow`} value={formatMinorAsCurrency(summary.netCashFlowMinor, currency)} tone={summary.netCashFlowMinor >= 0 ? "success" : "danger"} />
      <SummaryCard label={`${label} saved`} value={formatMinorAsCurrency(summary.savedMinor, currency)} tone={summary.savedMinor >= 0 ? "success" : "danger"} />
      <SummaryCard label="Active records" value={`${summary.activeTransactionCount}`} />
    </View>
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

function TransactionRow({ transaction }: { transaction: TransactionView }) {
  const tone = transaction.type === "income" ? "success" : transaction.type === "expense" ? "danger" : "default";

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/transactions/${transaction.id}` as Href)} style={styles.transactionRow}>
      <View style={[styles.typeMarker, styles[`${transaction.type}Marker`]]} />
      <View style={styles.transactionCopy}>
        <AppText variant="label">{transaction.title}</AppText>
        <AppText tone="subtle" variant="caption">
          {transaction.detail}
        </AppText>
        <AppText tone={transaction.status === "cancelled" ? "danger" : "subtle"} variant="caption">
          {transaction.occurredAt} - {transaction.status ?? "active"}
        </AppText>
      </View>
      <AppText tone={tone} variant="label">
        {formatTransactionAmount(transaction)}
      </AppText>
    </Pressable>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.filterChip, active ? styles.filterChipActive : null]}>
      <AppText tone={active ? "inverse" : "default"} variant="caption">
        {label}
      </AppText>
    </Pressable>
  );
}

function formatTransactionAmount(transaction: TransactionView) {
  if (transaction.type === "income") return `+${formatMinorAsCurrency(transaction.amountMinor, transaction.currency)}`;
  if (transaction.type === "expense") return formatMinorAsCurrency(-transaction.amountMinor, transaction.currency);
  return formatMinorAsCurrency(transaction.amountMinor, transaction.currency);
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "The transactions request failed.";
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  headerCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  periodFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  summaryCard: {
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
  firstUseCard: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  filterChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  listCard: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
  },
  groupCard: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
  },
  groupHeader: {
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceMuted,
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  transactionCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  typeMarker: {
    width: 4,
    minHeight: 54,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.textSubtle,
  },
  incomeMarker: { backgroundColor: theme.colors.success },
  expenseMarker: { backgroundColor: theme.colors.danger },
  transferMarker: { backgroundColor: theme.colors.primaryMuted },
  adjustmentMarker: { backgroundColor: theme.colors.warning },
});
