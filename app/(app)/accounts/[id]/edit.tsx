import { useLocalSearchParams } from "expo-router";

import { useAccount } from "@/src/features/accounts/api/accountsHooks";
import { AccountFormScreen } from "@/src/features/accounts/screens/AccountFormScreen";
import { AppScreen } from "@/src/components/AppScreen";
import { InlineState } from "@/src/features/finance/components/InlineState";

export default function EditAccountRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const account = useAccount(id);

  if (account.isLoading) {
    return (
      <AppScreen>
        <InlineState title="Loading account" message="Fetching account details." />
      </AppScreen>
    );
  }

  if (!account.data) {
    return (
      <AppScreen>
        <InlineState title="Account unavailable" message="This account could not be loaded." />
      </AppScreen>
    );
  }

  return <AccountFormScreen account={account.data} />;
}
