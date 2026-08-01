import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { AppTextInput } from "@/src/components/AppTextInput";
import { useAccounts } from "@/src/features/accounts/api/accountsHooks";
import { InlineState } from "@/src/features/finance/components/InlineState";
import { minorToDisplayParts } from "@/src/features/finance/money";
import type { SavingsGoalStatus } from "@/src/features/finance/types";
import {
  useCreateSavingsGoal,
  useSavingsGoal,
  useSavingsGoals,
  useSetSavingsGoalStatus,
  useUpdateSavingsGoal,
} from "@/src/features/savings/api/savingsGoalsHooks";
import type { SavingsGoalFormValues } from "@/src/features/savings/api/savingsGoalMappers";
import { theme } from "@/src/theme";

type SavingsGoalFormScreenProps = {
  goalId?: string;
};

export function SavingsGoalFormScreen({ goalId }: SavingsGoalFormScreenProps) {
  const accounts = useAccounts();
  const goals = useSavingsGoals();
  const goal = useSavingsGoal(goalId);
  const create = useCreateSavingsGoal();
  const update = useUpdateSavingsGoal(goalId ?? "");
  const setStatus = useSetSavingsGoalStatus(goalId ?? "");
  const [error, setError] = useState<string>();
  const [values, setValues] = useState<SavingsGoalFormValues>({
    name: "",
    target: "",
    targetDate: "",
    currency: "BDT",
    linkedAccountId: "",
  });
  const savingsAccounts = useMemo(
    () => (accounts.data ?? []).filter((account) => account.isSavings && !account.isArchived),
    [accounts.data],
  );
  const loadedGoal = goal.data;
  const effectiveValues = loadedGoal
    ? {
        name: values.name || loadedGoal.name,
        target: values.target || formatMinorForInput(loadedGoal.targetMinor),
        targetDate: values.targetDate || loadedGoal.targetDate || "",
        currency: loadedGoal.currency,
        linkedAccountId: values.linkedAccountId || loadedGoal.linkedAccountId || "",
      }
    : values;

  async function handleSubmit() {
    setError(undefined);
    try {
      if (loadedGoal) {
        await update.mutateAsync({ ...effectiveValues, status: loadedGoal.status });
      } else {
        await create.mutateAsync(effectiveValues);
      }
      router.replace("/savings");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Savings goal could not be saved.");
    }
  }

  function confirmStatus(status: SavingsGoalStatus) {
    const title = `${status[0].toUpperCase()}${status.slice(1)} goal?`;
    const message = status === "completed"
      ? "Completing a goal changes planning status only. It does not move money."
      : "Goal status will change, but account and transaction history remain unchanged.";
    const action = async () => {
      setError(undefined);
      try {
        await setStatus.mutateAsync(status);
        router.replace("/savings");
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Goal status could not be changed.");
      }
    };

    if (Platform.OS === "web") {
      if (globalThis.confirm(`${title}\n\n${message}`)) void action();
      return;
    }

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Continue", onPress: () => void action() },
    ]);
  }

  if (accounts.isLoading || goals.isLoading || (goalId && goal.isLoading)) {
    return (
      <AppScreen>
        <InlineState title="Preparing goal" message="Loading savings accounts and existing goals." />
      </AppScreen>
    );
  }

  if (accounts.error || goals.error || goal.error) {
    return (
      <AppScreen>
        <InlineState title="Savings goal unavailable" message={getMessage(accounts.error ?? goals.error ?? goal.error)} />
      </AppScreen>
    );
  }

  if (savingsAccounts.length === 0) {
    return (
      <AppScreen>
        <InlineState
          actionLabel="Create savings account"
          message="Create an active account marked as savings before adding a goal."
          onAction={() => router.push("/accounts/new")}
          title="No savings accounts"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <AppText tone="subtle" variant="label">Progress comes from account balance</AppText>
        <AppText variant="title">{loadedGoal ? "Edit savings goal" : "Create savings goal"}</AppText>
      </View>

      <View style={styles.card}>
        <AppTextInput
          label="Goal name"
          onChangeText={(name) => setValues((current) => ({ ...current, name }))}
          placeholder="Emergency fund"
          value={effectiveValues.name}
        />
        <AppTextInput
          keyboardType="decimal-pad"
          label="Target amount"
          onChangeText={(target) => setValues((current) => ({ ...current, target }))}
          placeholder="100000.00"
          value={effectiveValues.target}
        />
        <AppTextInput
          label="Target date"
          onChangeText={(targetDate) => setValues((current) => ({ ...current, targetDate }))}
          placeholder="YYYY-MM-DD, optional"
          value={effectiveValues.targetDate}
        />

        <View style={styles.group}>
          <AppText variant="label">Linked savings account</AppText>
          <View style={styles.chips}>
            {savingsAccounts.map((account) => (
              <Chip
                key={account.id}
                active={effectiveValues.linkedAccountId === account.id}
                label={`${account.name} (${account.currency})`}
                onPress={() =>
                  setValues((current) => ({
                    ...current,
                    linkedAccountId: account.id,
                    currency: account.currency,
                  }))
                }
              />
            ))}
          </View>
          <AppText tone="subtle" variant="caption">
            One active or paused goal can link to each savings account.
          </AppText>
        </View>

        {error ? <AppText style={styles.error} tone="danger" variant="caption">{error}</AppText> : null}

        <AppButton
          loading={create.isPending || update.isPending}
          onPress={handleSubmit}
          title={loadedGoal ? "Save goal" : "Create goal"}
        />

        {loadedGoal ? (
          <View style={styles.actions}>
            <AppButton loading={setStatus.isPending} onPress={() => confirmStatus(loadedGoal.status === "paused" || loadedGoal.status === "archived" ? "active" : "paused")} title={loadedGoal.status === "paused" || loadedGoal.status === "archived" ? "Resume" : "Pause"} variant="secondary" />
            {loadedGoal.status !== "completed" ? (
              <AppButton loading={setStatus.isPending} onPress={() => confirmStatus("completed")} title="Complete" variant="secondary" />
            ) : null}
            {loadedGoal.status !== "archived" ? (
              <AppButton loading={setStatus.isPending} onPress={() => confirmStatus("archived")} title="Archive" variant="ghost" />
            ) : null}
          </View>
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
  return error instanceof Error ? error.message : "Savings goal request failed.";
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: theme.spacing.xxxl },
  header: { gap: theme.spacing.xxs, marginBottom: theme.spacing.lg },
  card: { gap: theme.spacing.lg, padding: theme.spacing.lg, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.borderSubtle, backgroundColor: theme.colors.surface },
  group: { gap: theme.spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs },
  chip: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  chipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  actions: { gap: theme.spacing.sm },
  error: { padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.dangerSurface },
});
