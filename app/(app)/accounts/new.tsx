import { useLocalSearchParams } from "expo-router";

import { AccountFormScreen } from "@/src/features/accounts/screens/AccountFormScreen";

export default function NewAccountRoute() {
  const params = useLocalSearchParams<{ savings?: string }>();
  return <AccountFormScreen defaultSavings={params.savings === "true"} />;
}
