import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { AppTextInput } from "@/src/components/AppTextInput";
import { useAccounts } from "@/src/features/accounts/api/accountsHooks";
import { useCategories } from "@/src/features/categories/api/categoriesHooks";
import { getTransactionViews } from "@/src/features/finance/api/realFinanceSelectors";
import { InlineState } from "@/src/features/finance/components/InlineState";
import { formatMinorAsCurrency } from "@/src/features/finance/money";
import type { TransactionView } from "@/src/features/finance/selectors";
import type { Transaction } from "@/src/features/finance/types";
import { useTransactions } from "@/src/features/transactions/api/transactionsHooks";
import { theme } from "@/src/theme";

type TransactionFilter = "all" | Transaction["type"];
type StatusFilter = "active" | "cancelled" | "all";

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
  const [search, setSearch] = useState("");
  const isLoading = accounts.isLoading || categories.isLoading || transactions.isLoading;
  const error = accounts.error ?? categories.error ?? transactions.error;

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
      const matchesSearch =
        !normalizedSearch ||
        transaction.title.toLowerCase().includes(normalizedSearch) ||
        transaction.detail.toLowerCase().includes(normalizedSearch);
      return matchesType && matchesStatus && matchesSearch;
    });
  }, [filter, search, statusFilter, transactionViews]);

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
            <InlineState
              actionLabel="Add first transaction"
              message="Create an account and initialize categories first, then add income, expense or transfer records."
              onAction={() => router.push("/transactions/new")}
              title="No transactions yet"
            />
          ) : null}

          <View style={styles.listCard}>
            {filteredTransactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </View>
        </>
      ) : null}
    </AppScreen>
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
