import { router, type Href } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { useAccounts } from "@/src/features/accounts/api/accountsHooks";
import { useCategories } from "@/src/features/categories/api/categoriesHooks";
import { getAccountBalancesForDisplay } from "@/src/features/finance/api/realFinanceSelectors";
import { InlineState } from "@/src/features/finance/components/InlineState";
import { formatMinorAsCurrency } from "@/src/features/finance/money";
import { isLiabilityAccount } from "@/src/features/finance/validation";
import { useTransactions } from "@/src/features/transactions/api/transactionsHooks";
import { theme } from "@/src/theme";

export function AccountsListScreen() {
  const accounts = useAccounts();
  const categories = useCategories();
  const transactions = useTransactions();
  const isLoading = accounts.isLoading || categories.isLoading || transactions.isLoading;
  const error = accounts.error ?? categories.error ?? transactions.error;
  const balances =
    accounts.data && categories.data && transactions.data
      ? getAccountBalancesForDisplay(accounts.data, categories.data, transactions.data)
      : [];

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText tone="subtle" variant="label">
            Balances
          </AppText>
          <AppText variant="title">Accounts</AppText>
        </View>
        <AppButton onPress={() => router.push("/accounts/new")} title="Add" />
      </View>

      {isLoading ? <InlineState title="Loading accounts" message="Getting your account balances." /> : null}
      {error ? (
        <InlineState
          actionLabel="Retry"
          message={getMessage(error)}
          onAction={() => {
            void accounts.refetch();
            void categories.refetch();
            void transactions.refetch();
          }}
          title="We couldn't load your accounts"
        />
      ) : null}

      {!isLoading && !error && balances.length === 0 ? (
        <InlineState
          actionLabel="Create first account"
          message="Add your first account to start tracking your money."
          onAction={() => router.push("/accounts/new")}
          title="No accounts yet"
        />
      ) : null}

      <View style={styles.list}>
        {balances.map(({ account, balanceMinor }) => (
          <View key={account.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardCopy}>
                <AppText variant="label">{account.name}</AppText>
                <AppText tone="subtle" variant="caption">
                  {account.type.replaceAll("_", " ")} - {account.currency}
                </AppText>
                <AppText tone="subtle" variant="caption">
                  {account.isSavings ? "Savings account" : "General account"} -{" "}
                  {isLiabilityAccount(account) ? "Liability" : "Asset"}
                  {account.isArchived ? " - Archived" : ""}
                </AppText>
              </View>
              <AppText tone={isLiabilityAccount(account) ? "danger" : "default"} variant="metric">
                {formatMinorAsCurrency(balanceMinor, account.currency)}
              </AppText>
            </View>
            <AppButton onPress={() => router.push(`/accounts/${account.id}` as Href)} title="View details" variant="secondary" />
          </View>
        ))}
      </View>
    </AppScreen>
  );
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "We couldn't load your accounts. Please try again.";
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
  list: {
    gap: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  cardHeader: {
    flexDirection: "row",
    gap: theme.spacing.md,
    justifyContent: "space-between",
  },
  cardCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
});
