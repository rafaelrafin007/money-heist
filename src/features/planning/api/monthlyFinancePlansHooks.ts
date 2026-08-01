import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { financeQueryKeys } from "@/src/features/finance/api/queryKeys";
import {
  getMonthlyFinancePlan,
  upsertMonthlyFinancePlan,
} from "@/src/features/planning/api/monthlyFinancePlansRepository";
import type { MonthlyFinancePlanFormValues } from "@/src/features/planning/api/monthlyFinancePlanMappers";
import { useAuth } from "@/src/providers/AuthProvider";

export function useMonthlyFinancePlan(monthStart: string, currency: string) {
  const { user, isInitializing } = useAuth();
  return useQuery({
    queryKey: financeQueryKeys.monthlyPlan(user?.id ?? "anonymous", monthStart, currency),
    queryFn: () => getMonthlyFinancePlan(monthStart, currency),
    enabled: Boolean(user?.id && monthStart && currency) && !isInitializing,
  });
}

export function useUpsertMonthlyFinancePlan(monthStart: string, currency: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (values: MonthlyFinancePlanFormValues) => upsertMonthlyFinancePlan(values),
    onSuccess: () => {
      if (!user?.id) return;
      void queryClient.invalidateQueries({ queryKey: financeQueryKeys.monthlyPlan(user.id, monthStart, currency) });
      void queryClient.invalidateQueries({ queryKey: financeQueryKeys.planning(user.id, monthStart, currency) });
      void queryClient.invalidateQueries({ queryKey: financeQueryKeys.dashboard(user.id) });
    },
  });
}
