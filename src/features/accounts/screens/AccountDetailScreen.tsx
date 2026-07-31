import { router, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { useAccount, useAccounts, useArchiveAccount, useRestoreAccount } from "@/src/features/accounts/api/accountsHooks";
import { useCategories } from "@/src/features/categories/api/categoriesHooks";
import { getAccountBalancesForDisplay } from "@/src/features/finance/api/realFinanceSelectors";
import { InlineState } from "@/src/features/finance/components/InlineState";
import { formatMinorAsCurrency } from "@/src/features/finance/money";
import { isLiabilityAccount } from "@/src/features/finance/validation";
import { useTransactions } from "@/src/features/transactions/api/transactionsHooks";
import { theme } from "@/src/theme";

type AccountDetailScreenProps = {
  accountId: string;
};

export function AccountDetailScreen({ accountId }: AccountDetailScreenProps) {
  const account = useAccount(accountId);
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions();
  const archive = useArchiveAccount(accountId);
  const restore = useRestoreAccount(accountId);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [error, setError] = useState<string>();
  const balance = accounts.data && categories.data && transactions.data
    ? getAccountBalancesForDisplay(accounts.data, categories.data, transactions.data).find(
        (item) => item.account.id === accountId,
      )?.balanceMinor
    : undefined;

  async function handleArchiveToggle() {
    setError(undefined);
    if (!account.data) return;

    if (!account.data.isArchived && !confirmArchive) {
      setConfirmArchive(true);
      return;
    }

    try {
      if (account.data.isArchived) {
        await restore.mutateAsync();
      } else {
        await archive.mutateAsync();
        setConfirmArchive(false);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Account archive state could not be changed.");
    }
  }

  if (account.isLoading) {
    return (
      <AppScreen>
        <InlineState title="Loading account" message="Fetching this account from Supabase." />
      </AppScreen>
    );
  }

  if (account.error || !account.data) {
    return (
      <AppScreen>
        <InlineState
          actionLabel="Back to accounts"
          message={account.error instanceof Error ? account.error.message : "This account could not be loaded."}
          onAction={() => router.replace("/accounts" as Href)}
          title="Account unavailable"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <AppText tone="subtle" variant="label">
          {account.data.isArchived ? "Archived account" : "Account"}
        </AppText>
        <AppText variant="title">{account.data.name}</AppText>
      </View>

      <View style={styles.card}>
        <Row label="Current balance" value={formatMinorAsCurrency(balance ?? 0, account.data.currency)} />
        <Row label="Type" value={account.data.type.replaceAll("_", " ")} />
        <Row label="Classification" value={account.data.isSavings ? "Savings" : "Not savings"} />
        <Row label="Balance class" value={isLiabilityAccount(account.data) ? "Liability" : "Asset"} />
        <Row label="Currency" value={account.data.currency} />
        <Row label="Opening balance" value={formatMinorAsCurrency(account.data.openingBalanceMinor, account.data.currency)} />
      </View>

      {confirmArchive ? (
        <AppText style={styles.warning} tone="danger" variant="caption">
          Press Archive account again to confirm. Archived accounts remain in old transactions but cannot be used for new transactions.
        </AppText>
      ) : null}
      {error ? (
        <AppText style={styles.warning} tone="danger" variant="caption">
          {error}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        <AppButton onPress={() => router.push(`/accounts/${accountId}/edit` as Href)} title="Edit account" />
        <AppButton
          loading={archive.isPending || restore.isPending}
          onPress={handleArchiveToggle}
          title={account.data.isArchived ? "Restore account" : "Archive account"}
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
      <AppText variant="label">{value}</AppText>
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
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
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
});
