import { router, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { AppTextInput } from "@/src/components/AppTextInput";
import { useCreateAccount, useUpdateAccount } from "@/src/features/accounts/api/accountsHooks";
import type { AccountFormValues } from "@/src/features/finance/api/databaseMappers";
import { minorToDisplayParts } from "@/src/features/finance/money";
import type { Account, AccountType } from "@/src/features/finance/types";
import { theme } from "@/src/theme";

const accountTypes: AccountType[] = ["cash", "bank", "mobile_wallet", "savings", "credit_card", "investment", "loan"];

type AccountFormScreenProps = {
  account?: Account;
  defaultSavings?: boolean;
};

export function AccountFormScreen({ account, defaultSavings = false }: AccountFormScreenProps) {
  const isEdit = Boolean(account);
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount(account?.id ?? "");
  const [values, setValues] = useState<AccountFormValues>({
    name: account?.name ?? "",
    accountType: account?.type ?? (defaultSavings ? "savings" : "cash"),
    currency: account?.currency ?? "BDT",
    openingBalance: account ? formatMinorForInput(account.openingBalanceMinor) : "0",
    isSavings: account?.isSavings ?? defaultSavings,
  });
  const [error, setError] = useState<string>();

  async function handleSubmit() {
    setError(undefined);
    try {
      if (isEdit && account) {
        await updateAccount.mutateAsync({ name: values.name, isSavings: values.isSavings });
        router.replace(`/accounts/${account.id}` as Href);
      } else {
        const created = await createAccount.mutateAsync(values);
        router.replace(`/accounts/${created.id}` as Href);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Account could not be saved.");
    }
  }

  return (
    <AppScreen scroll>
      <View style={styles.header}>
        <AppText tone="subtle" variant="label">
          {isEdit ? "Edit account" : "New account"}
        </AppText>
        <AppText variant="title">{isEdit ? account?.name : "Create account"}</AppText>
      </View>

      <View style={styles.card}>
        <AppTextInput
          label="Account name"
          onChangeText={(name) => setValues((current) => ({ ...current, name }))}
          placeholder="Cash, Main bank, bKash"
          value={values.name}
        />

        {!isEdit ? (
          <>
            <View style={styles.group}>
              <AppText variant="label">Account type</AppText>
              <View style={styles.chips}>
                {accountTypes.map((type) => (
                  <Chip
                    key={type}
                    active={values.accountType === type}
                    label={type.replaceAll("_", " ")}
                    onPress={() =>
                      setValues((current) => ({
                        ...current,
                        accountType: type,
                        isSavings: type === "savings" ? true : current.isSavings,
                      }))
                    }
                  />
                ))}
              </View>
            </View>

            <AppTextInput
              autoCapitalize="characters"
              label="Currency"
              maxLength={3}
              onChangeText={(currency) =>
                setValues((current) => ({ ...current, currency: currency.toUpperCase() }))
              }
              value={values.currency}
            />

            <AppTextInput
              keyboardType="decimal-pad"
              label="Opening balance"
              onChangeText={(openingBalance) => setValues((current) => ({ ...current, openingBalance }))}
              placeholder="0.00"
              value={values.openingBalance}
            />
          </>
        ) : (
          <AppText style={styles.notice} tone="subtle" variant="caption">
            Currency, account type and opening balance are locked here to avoid silently changing historical calculations.
          </AppText>
        )}

        <View style={styles.group}>
          <AppText variant="label">Savings classification</AppText>
          <View style={styles.chips}>
            <Chip
              active={values.isSavings}
              label="Savings"
              onPress={() => setValues((current) => ({ ...current, isSavings: true }))}
            />
            <Chip
              active={!values.isSavings}
              label="Not savings"
              onPress={() => setValues((current) => ({ ...current, isSavings: false }))}
            />
          </View>
        </View>

        {error ? (
          <AppText style={styles.error} tone="danger" variant="caption">
            {error}
          </AppText>
        ) : null}

        <AppButton
          loading={createAccount.isPending || updateAccount.isPending}
          onPress={handleSubmit}
          title={isEdit ? "Save account" : "Create account"}
        />
      </View>
    </AppScreen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : null]}
    >
      <AppText tone={active ? "inverse" : "default"} variant="caption">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing.xxs,
    marginBottom: theme.spacing.lg,
  },
  card: {
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surface,
  },
  group: {
    gap: theme.spacing.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  notice: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceTint,
  },
  error: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dangerSurface,
  },
});

function formatMinorForInput(amountMinor: number) {
  const parts = minorToDisplayParts(amountMinor);
  const sign = parts.sign < 0 ? "-" : "";
  return `${sign}${parts.major}.${String(parts.minor).padStart(2, "0")}`;
}
