import { useLocalSearchParams } from "expo-router";

import { BudgetFormScreen } from "@/src/features/budgets/BudgetFormScreen";

export default function NewBudgetRoute() {
  const params = useLocalSearchParams<{ monthStart?: string }>();
  return <BudgetFormScreen monthStart={params.monthStart} />;
}
