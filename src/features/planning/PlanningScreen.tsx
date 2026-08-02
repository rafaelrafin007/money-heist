import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/src/components/AppButton";
import { AppCard } from "@/src/components/AppCard";
import { AppScreen } from "@/src/components/AppScreen";
import { AppText } from "@/src/components/AppText";
import { AppTextInput } from "@/src/components/AppTextInput";
import { MetricTile } from "@/src/components/MetricTile";
import { SectionHeader } from "@/src/components/SectionHeader";
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
      setMessage("Monthly plan saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We couldn't save your monthly plan. Please try again.");
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
      <SectionHeader
        eyebrow="User estimates"
        subtitle="Use expected income, obligations, and a buffer to estimate potential savings."
        title="Monthly plan"
      />

      <AppCard padding="md" style={styles.monthCard}>
        <View style={styles.monthControls}>
          <AppButton variant="secondary" onPress={() => changeMonth(-1)} title="Previous" />
          <View style={styles.monthLabel}>
            <AppText variant="label">{monthLabel(monthStart)}</AppText>
            <AppText tone="subtle" variant="caption">BDT calendar month</AppText>
          </View>
          <AppButton variant="secondary" onPress={() => changeMonth(1)} title="Next" />
        </View>
      </AppCard>

      {plan.isLoading ? <InlineState title="Loading plan" message="Getting your monthly plan." /> : null}
      {plan.error ? <InlineState title="We couldn't load your monthly plan" message={getMessage(plan.error)} /> : null}

      {!plan.isLoading && !plan.error ? (
        <AppCard style={styles.card}>
          <AppText tone="subtle" variant="caption">
            These are your estimates for the month. Use them to calculate potential savings.
          </AppText>

          {plan.data ? (
            <View style={styles.savedGrid}>
              <MetricTile label="Expected income" value={formatMinorAsCurrency(plan.data.expectedRemainingIncomeMinor, plan.data.currency)} tone="success" />
              <MetricTile label="Fixed expenses" value={formatMinorAsCurrency(-plan.data.upcomingFixedExpensesMinor, plan.data.currency)} tone="danger" />
              <MetricTile label="Debt payments" value={formatMinorAsCurrency(-plan.data.debtObligationsMinor, plan.data.currency)} tone="warning" />
              <MetricTile label="Safety buffer" value={formatMinorAsCurrency(plan.data.safetyBufferMinor, plan.data.currency)} tone="primary" />
            </View>
          ) : null}

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

          {message ? <AppText style={styles.message} tone="subtle" variant="caption">{message}</AppText> : null}

          <AppButton loading={upsert.isPending} onPress={handleSubmit} title="Save monthly plan" />
        </AppCard>
      ) : null}
    </AppScreen>
  );
}

function formatMinorForInput(amountMinor: number) {
  const parts = minorToDisplayParts(amountMinor);
  return `${parts.major}.${String(parts.minor).padStart(2, "0")}`;
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "We couldn't load your monthly plan. Please try again.";
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: theme.spacing.xxxl },
  monthCard: { marginBottom: theme.spacing.lg },
  monthControls: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  monthLabel: { flex: 1, alignItems: "center", gap: theme.spacing.xxs },
  card: { gap: theme.spacing.lg, ...theme.shadows.card },
  savedGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md },
  message: { padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted },
});
