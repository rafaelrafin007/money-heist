import { router } from "expo-router";

import { AppScreen } from "@/src/components/AppScreen";
import { InlineState } from "@/src/features/finance/components/InlineState";

export function BudgetsScreen() {
  return (
    <AppScreen>
      <InlineState
        actionLabel="Back to dashboard"
        message="Budget persistence is not enabled in this phase. Real dashboard totals are calculated only from accounts and transactions."
        onAction={() => router.replace("/dashboard")}
        title="Budgets unavailable"
      />
    </AppScreen>
  );
}
