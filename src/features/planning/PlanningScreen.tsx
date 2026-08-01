import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { AppTextInput } from "@/src/components/AppTextInput";
import { getCurrentCalendarMonth, monthLabel, shiftCalendarMonth } from "@/src/features/finance/dates";
import { InlineState } from "@/src/features/finance/components/InlineState";
import { formatMinorAsCurrency, minorToDisplayParts } from "@/src/features/finance/money";
import { useMonthlyFinancePlan, useUpsertMonthlyFinancePlan } from "@/src/features/planning/api/monthlyFinancePlansHooks";
import type { MonthlyFinancePlanFormValues } from "@/src/features/planning/api/monthlyFinancePlanMappers";
import { theme } from "@/src/theme";

const currentMonthStart = getCurrentCalendarMonth().start;

export function PlanningScreen() {
  const [monthStart, setMonthStart] = useState(currentMonthStart);
  const [values, setValues] = useState<MonthlyFinancePlanFormValues>({
    monthStart,
    currency: "BDT",
    expectedRemainingIncome: "",
    upcomingFixedExpenses: "",
    debtObligations: "",
    safetyBuffer: "",
    notes: "",
  });
  const [message, setMessage] = useState<string>();
  const plan = useMonthlyFinancePlan(monthStart, "BDT");
  const upsert = useUpsertMonthlyFinancePlan(monthStart, "BDT");
  const effectiveValues = plan.data
    ? {
        monthStart,
        currency: plan.data.currency,
        expectedRemainingIncome: values.expectedRemainingIncome || formatMinorForInput(plan.data.expectedRemainingIncomeMinor),
        upcomingFixedExpenses: values.upcomingFixedExpenses || formatMinorForInput(plan.data.upcomingFixedExpensesMinor),
        debtObligations: values.debtObligations || formatMinorForInput(plan.data.debtObligationsMinor),
        safetyBuffer: values.safetyBuffer || formatMinorForInput(plan.data.safetyBufferMinor),
        notes: values.notes || plan.data.notes || "",
      }
    : { ...values, monthStart };

  async function handleSubmit() {
    setMessage(undefined);
    try {
      await upsert.mutateAsync(effectiveValues);
      setMessage("Planning assumptions saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Planning assumptions could not be saved.");
    }
  }

  function changeMonth(offset: number) {
    const nextMonth = shiftCalendarMonth(monthStart, offset);
    setMonthStart(nextMonth);
    setValues({
      monthStart: nextMonth,
      currency: "BDT",
      expectedRemainingIncome: "",
      upcomingFixedExpenses: "",
      debtObligations: "",
      safetyBuffer: "",
      notes: "",
    });
    setMessage(undefined);
  }

  return (
    <AppScreen scroll contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <AppText tone="subtle" variant="label">User-entered estimates</AppText>
        <AppText variant="title">Monthly planning</AppText>
      </View>

      <View style={styles.monthControls}>
        <AppButton variant="secondary" onPress={() => changeMonth(-1)} title="Previous" />
        <View style={styles.monthLabel}>
          <AppText variant="label">{monthLabel(monthStart)}</AppText>
          <AppText tone="subtle" variant="caption">BDT calendar month</AppText>
        </View>
        <AppButton variant="secondary" onPress={() => changeMonth(1)} title="Next" />
      </View>

      {plan.isLoading ? <InlineState title="Loading plan" message="Fetching monthly planning assumptions." /> : null}
      {plan.error ? <InlineState title="Plan unavailable" message={getMessage(plan.error)} /> : null}

      {!plan.isLoading && !plan.error ? (
        <View style={styles.card}>
          <AppText tone="subtle" variant="caption">
            These are manual estimates. Recurring bills and automatic obligation detection are not implemented yet.
          </AppText>

          <AppTextInput
            keyboardType="decimal-pad"
            label="Expected remaining income"
            onChangeText={(expectedRemainingIncome) => setValues((current) => ({ ...current, expectedRemainingIncome }))}
            placeholder="0.00"
            value={effectiveValues.expectedRemainingIncome}
          />
          <AppTextInput
            keyboardType="decimal-pad"
            label="Upcoming fixed expenses"
            onChangeText={(upcomingFixedExpenses) => setValues((current) => ({ ...current, upcomingFixedExpenses }))}
            placeholder="0.00"
            value={effectiveValues.upcomingFixedExpenses}
          />
          <AppTextInput
            keyboardType="decimal-pad"
            label="Debt obligations"
            onChangeText={(debtObligations) => setValues((current) => ({ ...current, debtObligations }))}
            placeholder="0.00"
            value={effectiveValues.debtObligations}
          />
          <AppTextInput
            keyboardType="decimal-pad"
            label="Safety buffer"
            onChangeText={(safetyBuffer) => setValues((current) => ({ ...current, safetyBuffer }))}
            placeholder="0.00"
            value={effectiveValues.safetyBuffer}
          />
          <AppTextInput
            label="Notes"
            multiline
            onChangeText={(notes) => setValues((current) => ({ ...current, notes }))}
            placeholder="Optional planning note"
            value={effectiveValues.notes}
          />

          {plan.data ? (
            <AppText tone="subtle" variant="caption">
              Current saved estimates: income {formatMinorAsCurrency(plan.data.expectedRemainingIncomeMinor, plan.data.currency)}, fixed expenses {formatMinorAsCurrency(plan.data.upcomingFixedExpensesMinor, plan.data.currency)}, debt {formatMinorAsCurrency(plan.data.debtObligationsMinor, plan.data.currency)}, buffer {formatMinorAsCurrency(plan.data.safetyBufferMinor, plan.data.currency)}.
            </AppText>
          ) : null}

          {message ? <AppText style={styles.message} tone="subtle" variant="caption">{message}</AppText> : null}

          <AppButton loading={upsert.isPending} onPress={handleSubmit} title="Save planning assumptions" />
        </View>
      ) : null}
    </AppScreen>
  );
}

function formatMinorForInput(amountMinor: number) {
  const parts = minorToDisplayParts(amountMinor);
  return `${parts.major}.${String(parts.minor).padStart(2, "0")}`;
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "Planning request failed.";
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: theme.spacing.xxxl },
  header: { gap: theme.spacing.xxs, marginBottom: theme.spacing.lg },
  monthControls: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  monthLabel: { flex: 1, alignItems: "center", gap: theme.spacing.xxs },
  card: { gap: theme.spacing.lg, padding: theme.spacing.lg, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.borderSubtle, backgroundColor: theme.colors.surface },
  message: { padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted },
});
