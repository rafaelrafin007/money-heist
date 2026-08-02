import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { MetricTile } from "@/src/components/MetricTile";
import { SectionHeader } from "@/src/components/SectionHeader";
import { useAccounts } from "@/src/features/accounts/api/accountsHooks";
import { useCategories } from "@/src/features/categories/api/categoriesHooks";
import { InlineState } from "@/src/features/finance/components/InlineState";
import { formatMinorAsCurrency } from "@/src/features/finance/money";
import { useCancelTransaction, useRestoreTransaction, useTransaction } from "@/src/features/transactions/api/transactionsHooks";
import { theme } from "@/src/theme";

type TransactionDetailScreenProps = {
  transactionId: string;
};

export function TransactionDetailScreen({ transactionId }: TransactionDetailScreenProps) {
  const params = useLocalSearchParams<{ status?: string }>();
  const transaction = useTransaction(transactionId);
  const accounts = useAccounts();
  const categories = useCategories();
  const cancel = useCancelTransaction(transactionId);
  const restore = useRestoreTransaction(transactionId);
  const [error, setError] = useState<string>();

  async function handleStatusToggle() {
    if (!transaction.data) return;
    setError(undefined);

    if (transaction.data.status === "active") {
      confirmCancelTransaction();
      return;
    }

    await restoreTransaction();
  }

  function confirmCancelTransaction() {
    const title = "Cancel transaction?";
    const message = "Cancelled transactions remain in history and do not affect totals.";
    const action = () => {
      void cancelTransaction();
    };

    if (Platform.OS === "web") {
      if (globalThis.confirm(`${title}\n\n${message}`)) {
        action();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: "Keep transaction", style: "cancel" },
      { text: "Cancel transaction", style: "destructive", onPress: action },
    ]);
  }

  async function cancelTransaction() {
    try {
      await cancel.mutateAsync();
      void transaction.refetch();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Transaction status could not be changed.");
    }
  }

  async function restoreTransaction() {
    try {
      await restore.mutateAsync();
      void transaction.refetch();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Transaction status could not be changed.");
    }
  }

  if (transaction.isLoading) {
    return (
      <AppScreen>
        <InlineState title="Loading transaction" message="Getting transaction details." />
      </AppScreen>
    );
  }

  if (transaction.error || !transaction.data) {
    return (
      <AppScreen>
        <InlineState
          actionLabel="Back to transactions"
          message={transaction.error instanceof Error ? transaction.error.message : "This transaction could not be loaded."}
          onAction={() => router.replace("/transactions")}
          title="We couldn't load this transaction"
        />
      </AppScreen>
    );
  }

  const currentTransaction = transaction.data;
  const source = accounts.data?.find((account) => account.id === currentTransaction.accountId);
  const destination =
    currentTransaction.type === "transfer"
      ? accounts.data?.find((account) => account.id === currentTransaction.destinationAccountId)
      : undefined;
  const category =
    currentTransaction.type === "income" || currentTransaction.type === "expense"
      ? categories.data?.find((item) => item.id === currentTransaction.categoryId)
      : undefined;
  const visual = getTransactionVisual(currentTransaction.type);

  return (
    <AppScreen scroll contentStyle={styles.screenContent}>
      <SectionHeader
        eyebrow={currentTransaction.status === "cancelled" ? "Cancelled transaction" : "Transaction details"}
        subtitle={currentTransaction.status === "cancelled" ? "Cancelled transactions remain in history and do not affect totals." : "Review the account, category, date, and note."}
        title={titleForType(currentTransaction.type)}
      />

      <AppCard style={styles.heroCard}>
        <View style={[styles.typeIcon, { backgroundColor: visual.surface }]}>
          <Ionicons color={visual.color} name={visual.icon} size={24} />
        </View>
        <MetricTile
          label="Amount"
          prominent
          tone={currentTransaction.type === "income" ? "success" : currentTransaction.type === "expense" ? "danger" : "primary"}
          value={formatDetailAmount(currentTransaction.type, currentTransaction.amountMinor, currentTransaction.currency)}
        />
      </AppCard>

      <AppCard padding="none" style={styles.card}>
        <Row label="Source account" value={source?.name ?? "Archived or missing account"} />
        {destination ? <Row label="Destination account" value={destination.name} /> : null}
        {category ? <Row label="Category" value={category.name} /> : null}
        <Row label="Date" value={currentTransaction.occurredAt} />
        <Row label="Note" value={currentTransaction.note ?? "None"} />
        <Row label="Created" value={currentTransaction.createdAt} />
        <Row label="Updated" value={currentTransaction.updatedAt} />
      </AppCard>

      {params.status ? (
        <AppText style={styles.success} tone="success" variant="caption">
          {params.status}
        </AppText>
      ) : null}

      {error ? (
        <AppText style={styles.warning} tone="danger" variant="caption">
          {error}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        <AppButton disabled={currentTransaction.status !== "active"} onPress={() => router.push(`/transactions/${transactionId}/edit` as Href)} title="Edit transaction" />
        <AppButton
          loading={cancel.isPending || restore.isPending}
          onPress={handleStatusToggle}
          title={currentTransaction.status === "cancelled" ? "Restore transaction" : "Cancel transaction"}
          variant="secondary"
        />
      </View>
    </AppScreen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText tone="subtle">{label}</AppText>
      <AppText style={styles.rowValue} variant="label">
        {value}
      </AppText>
    </View>
  );
}

function titleForType(type: string) {
  if (type === "income") return "Income";
  if (type === "expense") return "Expense";
  if (type === "transfer") return "Transfer";
  return "Adjustment";
}

function formatDetailAmount(type: string, amountMinor: number, currency: string) {
  if (type === "income") return `+${formatMinorAsCurrency(amountMinor, currency)}`;
  if (type === "expense") return formatMinorAsCurrency(-amountMinor, currency);
  return formatMinorAsCurrency(amountMinor, currency);
}

function getTransactionVisual(type: string) {
  if (type === "income") {
    return { icon: "arrow-down-circle-outline" as const, color: theme.colors.success, surface: theme.colors.successSurface };
  }

  if (type === "expense") {
    return { icon: "arrow-up-circle-outline" as const, color: theme.colors.danger, surface: theme.colors.dangerSurface };
  }

  return { icon: "swap-horizontal-outline" as const, color: theme.colors.primary, surface: theme.colors.surfaceTint };
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: theme.spacing.xxxl,
  },
  heroCard: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  card: {
    marginTop: theme.spacing.lg,
  },
  typeIcon: {
    height: 48,
    width: 48,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  rowValue: {
    flexShrink: 1,
  },
  actions: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  warning: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dangerSurface,
  },
  success: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.successSurface,
  },
});
