import { router, useLocalSearchParams, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
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
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string>();

  async function handleStatusToggle() {
    if (!transaction.data) return;
    setError(undefined);
    if (transaction.data.status === "active" && !confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    try {
      if (transaction.data.status === "cancelled") {
        await restore.mutateAsync();
      } else {
        await cancel.mutateAsync();
        setConfirmCancel(false);
      }
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

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <AppText tone={currentTransaction.status === "cancelled" ? "danger" : "subtle"} variant="label">
          {currentTransaction.status}
        </AppText>
        <AppText variant="title">{currentTransaction.type}</AppText>
      </View>

      <View style={styles.card}>
        <Row label="Amount" value={formatMinorAsCurrency(currentTransaction.amountMinor, currentTransaction.currency)} />
        <Row label="Source account" value={source?.name ?? "Archived or missing account"} />
        {destination ? <Row label="Destination account" value={destination.name} /> : null}
        {category ? <Row label="Category" value={category.name} /> : null}
        <Row label="Date" value={currentTransaction.occurredAt} />
        <Row label="Note" value={currentTransaction.note ?? "None"} />
        <Row label="Created" value={currentTransaction.createdAt} />
        <Row label="Updated" value={currentTransaction.updatedAt} />
      </View>

      {params.status ? (
        <AppText style={styles.success} tone="success" variant="caption">
          {params.status}
        </AppText>
      ) : null}

      {confirmCancel ? (
        <AppText style={styles.warning} tone="danger" variant="caption">
          Press Cancel transaction again to confirm. Cancelled transactions remain in history but leave all totals.
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

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing.xxs,
    marginBottom: theme.spacing.lg,
  },
  card: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
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
