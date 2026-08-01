import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { AppTextInput } from "@/src/components/AppTextInput";
import {
  useArchiveBudget,
  useBudget,
  useCreateBudget,
  useRestoreBudget,
  useUpdateBudget,
} from "@/src/features/budgets/api/budgetsHooks";
import type { BudgetFormValues } from "@/src/features/budgets/api/budgetMappers";
import { useCategories } from "@/src/features/categories/api/categoriesHooks";
import { getCurrentCalendarMonth, monthLabel } from "@/src/features/finance/dates";
import { InlineState } from "@/src/features/finance/components/InlineState";
import { minorToDisplayParts } from "@/src/features/finance/money";
import { theme } from "@/src/theme";

type BudgetFormScreenProps = {
  budgetId?: string;
  monthStart?: string;
};

export function BudgetFormScreen({ budgetId, monthStart = getCurrentCalendarMonth().start }: BudgetFormScreenProps) {
  const categories = useCategories();
  const budget = useBudget(budgetId);
  const create = useCreateBudget(monthStart);
  const update = useUpdateBudget(budgetId ?? "", budget.data?.periodStart ?? monthStart);
  const archive = useArchiveBudget(budgetId ?? "", budget.data?.periodStart ?? monthStart);
  const restore = useRestoreBudget(budgetId ?? "", budget.data?.periodStart ?? monthStart);
  const [error, setError] = useState<string>();
  const expenseCategories = useMemo(
    () => (categories.data ?? []).filter((category) => category.kind === "expense" && !category.isArchived),
    [categories.data],
  );
  const [values, setValues] = useState<BudgetFormValues>({
    categoryId: "",
    monthStart,
    limit: "",
    currency: "BDT",
  });
  const isEdit = Boolean(budgetId);
  const loadedBudget = budget.data;
  const effectiveValues = loadedBudget
    ? {
        categoryId: loadedBudget.categoryId,
        monthStart: loadedBudget.periodStart,
        limit: values.limit || formatMinorForInput(loadedBudget.limitMinor),
        currency: loadedBudget.currency,
      }
    : values;

  async function handleSubmit() {
    setError(undefined);
    try {
      if (isEdit) {
        await update.mutateAsync({ limit: effectiveValues.limit });
      } else {
        await create.mutateAsync(effectiveValues);
      }
      router.replace("/budgets");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Budget could not be saved.");
    }
  }

  function confirmStatusChange(status: "archived" | "active") {
    const title = status === "archived" ? "Archive budget?" : "Restore budget?";
    const message = status === "archived"
      ? "Archived budgets remain in history but will not count as active planning."
      : "The budget will count again if no duplicate active budget exists.";
    const action = async () => {
      setError(undefined);
      try {
        if (status === "archived") {
          await archive.mutateAsync();
        } else {
          await restore.mutateAsync();
        }
        router.replace("/budgets");
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Budget status could not be changed.");
      }
    };

    if (Platform.OS === "web") {
      if (globalThis.confirm(`${title}\n\n${message}`)) void action();
      return;
    }

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: status === "archived" ? "Archive" : "Restore", style: status === "archived" ? "destructive" : "default", onPress: () => void action() },
    ]);
  }

  if (categories.isLoading || (isEdit && budget.isLoading)) {
    return (
      <AppScreen>
        <InlineState title="Preparing budget" message="Loading categories and budget details." />
      </AppScreen>
    );
  }

  if (categories.error || budget.error) {
    return (
      <AppScreen>
        <InlineState title="Budget unavailable" message={getMessage(categories.error ?? budget.error)} />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <AppText tone="subtle" variant="label">
          {monthLabel(effectiveValues.monthStart)}
        </AppText>
        <AppText variant="title">{isEdit ? "Edit budget" : "Create budget"}</AppText>
      </View>

      <View style={styles.card}>
        <View style={styles.group}>
          <AppText variant="label">Expense category</AppText>
          {isEdit ? (
            <AppText tone="subtle">{categories.data?.find((category) => category.id === effectiveValues.categoryId)?.name ?? "Existing category"}</AppText>
          ) : (
            <View style={styles.chips}>
              {expenseCategories.length === 0 ? (
                <AppText tone="subtle" variant="caption">Initialize or create expense categories first.</AppText>
              ) : (
                expenseCategories.map((category) => (
                  <Chip
                    key={category.id}
                    active={effectiveValues.categoryId === category.id}
                    label={category.name}
                    onPress={() => setValues((current) => ({ ...current, categoryId: category.id }))}
                  />
                ))
              )}
            </View>
          )}
        </View>

        <AppTextInput
          keyboardType="decimal-pad"
          label="Monthly limit"
          onChangeText={(limit) => setValues((current) => ({ ...current, limit }))}
          placeholder="10000.00"
          value={effectiveValues.limit}
        />

        <AppText tone="subtle" variant="caption">
          Currency: {effectiveValues.currency}. Category and month are locked after creation to avoid duplicate historical budgets.
        </AppText>

        {error ? <AppText style={styles.error} tone="danger" variant="caption">{error}</AppText> : null}

        <AppButton
          loading={create.isPending || update.isPending}
          onPress={handleSubmit}
          title={isEdit ? "Save budget" : "Create budget"}
        />

        {isEdit && loadedBudget ? (
          <AppButton
            loading={archive.isPending || restore.isPending}
            onPress={() => confirmStatusChange(loadedBudget.status === "archived" ? "active" : "archived")}
            title={loadedBudget.status === "archived" ? "Restore budget" : "Archive budget"}
            variant="secondary"
          />
        ) : null}
      </View>
    </AppScreen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <AppText tone={active ? "inverse" : "default"} variant="caption">{label}</AppText>
    </Pressable>
  );
}

function formatMinorForInput(amountMinor: number) {
  const parts = minorToDisplayParts(amountMinor);
  return `${parts.major}.${String(parts.minor).padStart(2, "0")}`;
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "Budget request failed.";
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: theme.spacing.xxxl },
  header: { gap: theme.spacing.xxs, marginBottom: theme.spacing.lg },
  card: { gap: theme.spacing.lg, padding: theme.spacing.lg, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.borderSubtle, backgroundColor: theme.colors.surface },
  group: { gap: theme.spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs },
  chip: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  chipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  error: { padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.dangerSurface },
});
