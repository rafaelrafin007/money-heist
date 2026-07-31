import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { AppTextInput } from "@/src/components/AppTextInput";
import { useTransactionsOverview } from "@/src/features/finance/hooks";
import { formatMinorAsCurrency } from "@/src/features/finance/money";
import type { TransactionView } from "@/src/features/finance/selectors";
import type { Transaction } from "@/src/features/finance/types";
import { theme } from "@/src/theme";

type TransactionFilter = "all" | Transaction["type"];

const filters: { label: string; value: TransactionFilter }[] = [
  { label: "All", value: "all" },
  { label: "Income", value: "income" },
  { label: "Expense", value: "expense" },
  { label: "Transfer", value: "transfer" },
];

export function TransactionsScreen() {
  const overview = useTransactionsOverview();
  const [filter, setFilter] = useState<TransactionFilter>("all");
  const [search, setSearch] = useState("");

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return overview.transactions.filter((transaction) => {
      const matchesType = filter === "all" || transaction.type === filter;
      const matchesSearch =
        !normalizedSearch ||
        transaction.title.toLowerCase().includes(normalizedSearch) ||
        transaction.detail.toLowerCase().includes(normalizedSearch);

      return matchesType && matchesSearch;
    });
  }, [filter, overview.transactions, search]);

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <AppText tone="subtle" variant="label">
          Demo ledger
        </AppText>
        <AppText variant="title">Transactions</AppText>
      </View>

      <AppTextInput
        autoCapitalize="none"
        label="Search transactions"
        onChangeText={setSearch}
        placeholder="Search by category, account or note"
        value={search}
      />

      <View style={styles.filters}>
        {filters.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter === item.value }}
            key={item.value}
            onPress={() => setFilter(item.value)}
            style={[styles.filterChip, filter === item.value ? styles.filterChipActive : null]}
          >
            <AppText tone={filter === item.value ? "inverse" : "default"} variant="caption">
              {item.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <View style={styles.listCard}>
        {filteredTransactions.length === 0 ? (
          <AppText style={styles.emptyState} tone="subtle">
            No transactions match this view.
          </AppText>
        ) : (
          filteredTransactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))
        )}
      </View>
    </AppScreen>
  );
}

function TransactionRow({ transaction }: { transaction: TransactionView }) {
  const tone = transaction.type === "income" ? "success" : transaction.type === "expense" ? "danger" : "default";

  return (
    <View style={styles.transactionRow}>
      <View style={[styles.typeMarker, styles[`${transaction.type}Marker`]]} />
      <View style={styles.transactionCopy}>
        <AppText variant="label">{transaction.title}</AppText>
        <AppText tone="subtle" variant="caption">
          {transaction.detail}
        </AppText>
        <AppText tone="subtle" variant="caption">
          {transaction.occurredAt}
        </AppText>
      </View>
      <AppText tone={tone} variant="label">
        {formatTransactionAmount(transaction)}
      </AppText>
    </View>
  );
}

function formatTransactionAmount(transaction: TransactionView) {
  if (transaction.type === "income") {
    return `+${formatMinorAsCurrency(transaction.amountMinor, transaction.currency)}`;
  }

  if (transaction.type === "expense") {
    return formatMinorAsCurrency(-transaction.amountMinor, transaction.currency);
  }

  return formatMinorAsCurrency(transaction.amountMinor, transaction.currency);
}

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing.xxs,
    marginBottom: theme.spacing.lg,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
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
  incomeMarker: {
    backgroundColor: theme.colors.success,
  },
  expenseMarker: {
    backgroundColor: theme.colors.danger,
  },
  transferMarker: {
    backgroundColor: theme.colors.primaryMuted,
  },
  adjustmentMarker: {
    backgroundColor: theme.colors.warning,
  },
  emptyState: {
    padding: theme.spacing.lg,
    textAlign: "center",
  },
});
