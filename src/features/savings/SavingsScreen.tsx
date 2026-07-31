import { router } from "expo-router";

import { AppScreen } from "@/src/components/AppScreen";
import { InlineState } from "@/src/features/finance/components/InlineState";

export function SavingsScreen() {
  return (
    <AppScreen>
      <InlineState
        actionLabel="Create savings account"
        message="Savings goals are not persisted yet. Create a savings account and transfer money into it to affect real saved-this-month and total savings metrics."
        onAction={() => router.push("/accounts/new")}
        title="Savings goals unavailable"
      />
    </AppScreen>
  );
}
