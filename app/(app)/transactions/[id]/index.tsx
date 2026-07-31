import { useLocalSearchParams } from "expo-router";

import { TransactionDetailScreen } from "@/src/features/transactions/screens/TransactionDetailScreen";

export default function TransactionDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TransactionDetailScreen transactionId={id} />;
}
