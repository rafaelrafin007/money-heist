import { describe, expect, it } from "vitest";

import { financeQueryKeys, getFinanceCachePrefix } from "@/src/features/finance/api/queryKeys";
import { clearAuthenticatedFinanceCache, queryClient } from "@/src/lib/queryClient";

describe("finance query keys", () => {
  it("scopes keys by user", () => {
    expect(financeQueryKeys.accounts("user-a")).not.toEqual(financeQueryKeys.accounts("user-b"));
    expect(financeQueryKeys.budgets("user-a", "2026-07-01")).not.toEqual(financeQueryKeys.budgets("user-a", "2026-08-01"));
    expect(financeQueryKeys.monthlyPlan("user-a", "2026-07-01", "BDT")).not.toEqual(financeQueryKeys.monthlyPlan("user-b", "2026-07-01", "BDT"));
    expect(getFinanceCachePrefix("user-a")).toEqual(["finance", "user-a"]);
  });

  it("clears authenticated finance cache on logout", () => {
    queryClient.setQueryData(financeQueryKeys.accounts("user-a"), ["private"]);
    queryClient.setQueryData(financeQueryKeys.budgets("user-a", "2026-07-01"), ["budget"]);
    queryClient.setQueryData(financeQueryKeys.savingsGoals("user-a"), ["goal"]);
    queryClient.setQueryData(financeQueryKeys.monthlyPlan("user-a", "2026-07-01", "BDT"), ["plan"]);
    queryClient.setQueryData(["public"], ["keep"]);

    clearAuthenticatedFinanceCache();

    expect(queryClient.getQueryData(financeQueryKeys.accounts("user-a"))).toBeUndefined();
    expect(queryClient.getQueryData(financeQueryKeys.budgets("user-a", "2026-07-01"))).toBeUndefined();
    expect(queryClient.getQueryData(financeQueryKeys.savingsGoals("user-a"))).toBeUndefined();
    expect(queryClient.getQueryData(financeQueryKeys.monthlyPlan("user-a", "2026-07-01", "BDT"))).toBeUndefined();
    expect(queryClient.getQueryData(["public"])).toEqual(["keep"]);
  });
});
