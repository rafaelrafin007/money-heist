import { useLocalSearchParams } from "expo-router";

import { SavingsGoalFormScreen } from "@/src/features/savings/SavingsGoalFormScreen";

export default function EditSavingsGoalRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  return <SavingsGoalFormScreen goalId={params.id} />;
}
