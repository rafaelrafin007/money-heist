import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { AppChip } from "@/src/components/AppChip";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { AppTextInput } from "@/src/components/AppTextInput";
import { SectionHeader } from "@/src/components/SectionHeader";
import { useAccounts } from "@/src/features/accounts/api/accountsHooks";
import { useCategories } from "@/src/features/categories/api/categoriesHooks";
import { InlineState } from "@/src/features/finance/components/InlineState";
import { shiftIsoDate, toIsoDate } from "@/src/features/finance/dates";
import type { TransactionFormValues } from "@/src/features/finance/api/databaseMappers";
import { minorToDisplayParts } from "@/src/features/finance/money";
import type { Category, Transaction } from "@/src/features/finance/types";
import {
  getTransactionSuccessMessage,
  sanitizeTransactionRoutePreset,
  type TransactionEntryMode,
} from "@/src/features/transactions/quickEntry";
import { useCreateTransaction, useUpdateTransaction } from "@/src/features/transactions/api/transactionsHooks";
import { theme } from "@/src/theme";

type TransactionFormScreenProps = {
  transaction?: Transaction;
};

const transactionTypes: TransactionFormValues["type"][] = ["income", "expense", "transfer"];

export function TransactionFormScreen({ transaction }: TransactionFormScreenProps) {
  const params = useLocalSearchParams<{ type?: string; mode?: string; accountId?: string; sourceAccountId?: string; destinationAccountId?: string; date?: string }>();
  const accounts = useAccounts();
  const categories = useCategories();
  const create = useCreateTransaction();
  const update = useUpdateTransaction(transaction?.id ?? "", transaction);
  const [values, setValues] = useState<TransactionFormValues>(() => ({
    type: transaction && transaction.type !== "adjustment" ? transaction.type : "expense",
    amount: transaction ? formatMinorForInput(transaction.amountMinor) : "",
    occurredAt: transaction?.occurredAt ?? toIsoDate(new Date()),
    accountId: transaction?.accountId ?? "",
    destinationAccountId: transaction?.type === "transfer" ? transaction.destinationAccountId : "",
    categoryId: transaction?.type === "income" || transaction?.type === "expense" ? transaction.categoryId : "",
    note: transaction?.note ?? "",
  }));
  const [error, setError] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const [presetApplied, setPresetApplied] = useState(Boolean(transaction));
  const activeAccounts = (accounts.data ?? []).filter((account) => !account.isArchived);
  const activeSavingsAccounts = activeAccounts.filter((account) => account.isSavings);
  const activeCategories = (categories.data ?? []).filter((category) => !category.isArchived);
  const entryMode: TransactionEntryMode = params.mode === "savings" ? "savings" : "standard";
  const selectableCategories = useMemo(
    () => activeCategories.filter((category) => category.kind === values.type),
    [activeCategories, values.type],
  );
  const destinationAccounts = entryMode === "savings" ? activeSavingsAccounts : activeAccounts;

  useEffect(() => {
    if (presetApplied || transaction || accounts.isLoading) {
      return;
    }

    const preset = sanitizeTransactionRoutePreset(params, activeAccounts);
    setValues((current) => ({
      ...current,
      type: preset.type,
      occurredAt: preset.occurredAt,
      accountId: preset.accountId,
      destinationAccountId:
        preset.destinationAccountId ||
        (preset.mode === "savings" && activeSavingsAccounts.length === 1 ? activeSavingsAccounts[0].id : ""),
    }));
    setPresetApplied(true);
  }, [accounts.isLoading, activeAccounts, activeSavingsAccounts, params, presetApplied, transaction]);

  async function handleSubmit() {
    setError(undefined);
    setSuccessMessage(undefined);
    try {
      const saved = transaction
        ? await update.mutateAsync(values)
        : await create.mutateAsync(values);
      const message = getTransactionSuccessMessage(saved, entryMode);
      setSuccessMessage(message);
      router.replace(`/transactions/${saved.id}?status=${encodeURIComponent(message)}` as Href);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Transaction could not be saved.");
    }
  }

  if (accounts.isLoading || categories.isLoading) {
    return (
      <AppScreen>
        <InlineState title="Preparing form" message="Loading accounts and categories." />
      </AppScreen>
    );
  }

  if (activeAccounts.length === 0) {
    return (
      <AppScreen>
        <InlineState
          actionLabel="Create account"
          message="Create at least one active account before adding transactions."
          onAction={() => router.push("/accounts/new")}
          title="No active accounts"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll contentStyle={styles.screenContent}>
      <SectionHeader
        eyebrow={transaction ? "Edit transaction" : entryMode === "savings" ? "Save money" : "New transaction"}
        subtitle={entryMode === "savings" ? "Saving moves money into one of your savings accounts. It is not counted as an expense." : "Choose the type, amount, account, date, and category."}
        title={transaction ? "Update transaction" : entryMode === "savings" ? "Save money" : "Add transaction"}
      />

      <AppCard style={styles.card}>
        <View style={styles.group}>
          <AppText variant="label">Type</AppText>
          <View style={styles.chips}>
            {transactionTypes.map((type) => (
              <AppChip
                key={type}
                active={values.type === type}
                disabled={Boolean(transaction)}
                label={type}
                onPress={() =>
                  setValues((current) => ({
                    ...current,
                    type,
                    categoryId: "",
                    destinationAccountId: type === "transfer" && entryMode === "savings" && activeSavingsAccounts.length === 1 ? activeSavingsAccounts[0].id : "",
                  }))
                }
              />
            ))}
          </View>
          {transaction ? (
            <AppText tone="subtle" variant="caption">
              Transaction type is locked while editing.
            </AppText>
          ) : null}
        </View>

        <AppTextInput
          keyboardType="decimal-pad"
          label="Amount"
          onChangeText={(amount) => setValues((current) => ({ ...current, amount }))}
          placeholder="1250.75"
          value={values.amount}
        />

        <View style={styles.group}>
          <AppText variant="label">Date shortcut</AppText>
          <View style={styles.chips}>
            <AppChip active={values.occurredAt === toIsoDate(new Date())} label="Today" onPress={() => setValues((current) => ({ ...current, occurredAt: toIsoDate(new Date()) }))} />
            <AppChip active={values.occurredAt === shiftIsoDate(toIsoDate(new Date()), -1)} label="Yesterday" onPress={() => setValues((current) => ({ ...current, occurredAt: shiftIsoDate(toIsoDate(new Date()), -1) }))} />
            <AppChip active={values.occurredAt !== toIsoDate(new Date()) && values.occurredAt !== shiftIsoDate(toIsoDate(new Date()), -1)} label="Custom date" onPress={() => undefined} />
          </View>
        </View>

        <AppTextInput
          label="Date"
          onChangeText={(occurredAt) => setValues((current) => ({ ...current, occurredAt }))}
          placeholder="YYYY-MM-DD"
          value={values.occurredAt}
        />

        <PickerGroup
          label={values.type === "income" ? "Destination account" : "Source account"}
          options={activeAccounts.map((account) => ({ id: account.id, label: `${account.name} (${account.currency})` }))}
          selectedId={values.accountId}
          onSelect={(accountId) => setValues((current) => ({ ...current, accountId }))}
        />

        {values.type === "transfer" ? (
          <PickerGroup
            label="Destination account"
            options={destinationAccounts.map((account) => ({ id: account.id, label: `${account.name} (${account.currency})` }))}
            selectedId={values.destinationAccountId}
            onSelect={(destinationAccountId) => setValues((current) => ({ ...current, destinationAccountId }))}
          />
        ) : (
          <PickerGroup
            label={`${values.type === "income" ? "Income" : "Expense"} category`}
            options={selectableCategories.map((category: Category) => ({ id: category.id, label: category.name }))}
            selectedId={values.categoryId}
            onSelect={(categoryId) => setValues((current) => ({ ...current, categoryId }))}
          />
        )}

        <AppTextInput
          label="Note"
          multiline
          onChangeText={(note) => setValues((current) => ({ ...current, note }))}
          placeholder="Optional note"
          value={values.note}
        />

        {error ? (
          <AppText style={styles.error} tone="danger" variant="caption">
            {error}
          </AppText>
        ) : null}

        {successMessage ? (
          <AppText style={styles.success} tone="success" variant="caption">
            {successMessage}
          </AppText>
        ) : null}

        <AppButton
          disabled={create.isPending || update.isPending}
          loading={create.isPending || update.isPending}
          onPress={handleSubmit}
          title={transaction ? "Save transaction" : getSubmitLabel(values.type, entryMode)}
        />
      </AppCard>
    </AppScreen>
  );
}

function PickerGroup({
  label,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  options: { id: string; label: string }[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.group}>
      <AppText variant="label">{label}</AppText>
      <View style={styles.chips}>
        {options.length === 0 ? (
          <AppText tone="subtle" variant="caption">
            No active options available.
          </AppText>
        ) : (
          options.map((option) => (
            <AppChip
              key={option.id}
              active={selectedId === option.id}
              label={option.label}
              onPress={() => onSelect(option.id)}
            />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: theme.spacing.xxxl,
  },
  card: {
    gap: theme.spacing.lg,
    ...theme.shadows.card,
  },
  group: {
    gap: theme.spacing.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  error: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dangerSurface,
  },
  success: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.successSurface,
  },
});

function formatMinorForInput(amountMinor: number) {
  const parts = minorToDisplayParts(amountMinor);
  return `${parts.major}.${String(parts.minor).padStart(2, "0")}`;
}

function getSubmitLabel(type: TransactionFormValues["type"], mode: TransactionEntryMode) {
  if (type === "income") return "Add income";
  if (type === "expense") return "Record expense";
  if (mode === "savings") return "Save money";
  return "Create transfer";
}
