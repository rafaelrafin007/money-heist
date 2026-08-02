import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { SectionHeader } from "@/src/components/SectionHeader";
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
    <AppScreen scroll contentStyle={styles.screenContent}>
      <SectionHeader
        action={<AppButton onPress={() => router.push("/accounts/new")} title="Add" />}
        eyebrow="Balances"
        subtitle="Review account balances, savings accounts, and liabilities."
        title="Accounts"
      />

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
          <AppCard key={account.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.accountIcon}>
                <Ionicons color={isLiabilityAccount(account) ? theme.colors.danger : account.isSavings ? theme.colors.success : theme.colors.primary} name={isLiabilityAccount(account) ? "card-outline" : account.isSavings ? "shield-checkmark-outline" : "wallet-outline"} size={22} />
              </View>
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
          </AppCard>
        ))}
      </View>
    </AppScreen>
  );
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "We couldn't load your accounts. Please try again.";
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: theme.spacing.xxxl,
  },
  list: {
    gap: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
    justifyContent: "space-between",
  },
  accountIcon: {
    height: 42,
    width: 42,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceMuted,
  },
  cardCopy: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
});
