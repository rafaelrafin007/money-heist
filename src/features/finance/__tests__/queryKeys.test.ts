import { describe, expect, it } from "vitest";

import { financeQueryKeys, getFinanceCachePrefix } from "@/src/features/finance/api/queryKeys";
import { clearAuthenticatedFinanceCache, queryClient } from "@/src/lib/queryClient";

describe("finance query keys", () => {
  it("scopes keys by user", () => {
    expect(financeQueryKeys.accounts("user-a")).not.toEqual(financeQueryKeys.accounts("user-b"));
    expect(getFinanceCachePrefix("user-a")).toEqual(["finance", "user-a"]);
  });

  it("clears authenticated finance cache on logout", () => {
    queryClient.setQueryData(financeQueryKeys.accounts("user-a"), ["private"]);
    queryClient.setQueryData(["public"], ["keep"]);

    clearAuthenticatedFinanceCache();

    expect(queryClient.getQueryData(financeQueryKeys.accounts("user-a"))).toBeUndefined();
    expect(queryClient.getQueryData(["public"])).toEqual(["keep"]);
  });
});
