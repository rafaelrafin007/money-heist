import { useLocalSearchParams } from "expo-router";

import { AppScreen } from "@/src/components/AppScreen";
import { InlineState } from "@/src/features/finance/components/InlineState";
import { useTransaction } from "@/src/features/transactions/api/transactionsHooks";
import { TransactionFormScreen } from "@/src/features/transactions/screens/TransactionFormScreen";

export default function EditTransactionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transaction = useTransaction(id);

  if (transaction.isLoading) {
    return (
      <AppScreen>
        <InlineState title="Loading transaction" message="Getting transaction details." />
      </AppScreen>
    );
  }

  if (!transaction.data) {
    return (
      <AppScreen>
        <InlineState title="We couldn't load this transaction" message="Please go back and try again." />
      </AppScreen>
    );
  }

  return <TransactionFormScreen transaction={transaction.data} />;
}
