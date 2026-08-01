import { useLocalSearchParams } from "expo-router";

import { BudgetFormScreen } from "@/src/features/budgets/BudgetFormScreen";

export default function EditBudgetRoute() {
  const params = useLocalSearchParams<{ id: string; monthStart?: string }>();
  return <BudgetFormScreen budgetId={params.id} monthStart={params.monthStart} />;
}
