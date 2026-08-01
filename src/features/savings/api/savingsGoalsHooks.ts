import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAccounts } from "@/src/features/accounts/api/accountsHooks";
import { financeQueryKeys } from "@/src/features/finance/api/queryKeys";
import type { SavingsGoalStatus } from "@/src/features/finance/types";
import {
  createSavingsGoal,
  getSavingsGoalById,
  listSavingsGoals,
  setSavingsGoalStatus,
  updateSavingsGoal,
} from "@/src/features/savings/api/savingsGoalsRepository";
import type { SavingsGoalFormValues, SavingsGoalUpdateValues } from "@/src/features/savings/api/savingsGoalMappers";
import { useAuth } from "@/src/providers/AuthProvider";

export function useSavingsGoals() {
  const { user, isInitializing } = useAuth();
  return useQuery({
    queryKey: financeQueryKeys.savingsGoals(user?.id ?? "anonymous"),
    queryFn: listSavingsGoals,
    enabled: Boolean(user?.id) && !isInitializing,
  });
}

export function useSavingsGoal(goalId?: string) {
  const { user, isInitializing } = useAuth();
  return useQuery({
    queryKey: financeQueryKeys.savingsGoal(user?.id ?? "anonymous", goalId ?? "missing"),
    queryFn: () => getSavingsGoalById(goalId ?? ""),
    enabled: Boolean(user?.id && goalId) && !isInitializing,
  });
}

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const accounts = useAccounts();
  const goals = useSavingsGoals();
  return useMutation({
    mutationFn: (values: SavingsGoalFormValues) => createSavingsGoal(values, accounts.data ?? [], goals.data ?? []),
    onSuccess: () => invalidateSavings(queryClient, user?.id),
  });
}

export function useUpdateSavingsGoal(goalId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const accounts = useAccounts();
  const goals = useSavingsGoals();
  return useMutation({
    mutationFn: (values: SavingsGoalUpdateValues) =>
      updateSavingsGoal(goalId, values, accounts.data ?? [], goals.data ?? []),
    onSuccess: () => {
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: financeQueryKeys.savingsGoal(user.id, goalId) });
      }
      invalidateSavings(queryClient, user?.id);
    },
  });
}

export function useSetSavingsGoalStatus(goalId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (status: SavingsGoalStatus) => setSavingsGoalStatus(goalId, status),
    onSuccess: () => invalidateSavings(queryClient, user?.id),
  });
}

function invalidateSavings(queryClient: ReturnType<typeof useQueryClient>, userId?: string) {
  if (!userId) return;
  void queryClient.invalidateQueries({ queryKey: financeQueryKeys.savingsGoals(userId) });
  void queryClient.invalidateQueries({ queryKey: financeQueryKeys.accounts(userId) });
  void queryClient.invalidateQueries({ queryKey: financeQueryKeys.transactions(userId) });
  void queryClient.invalidateQueries({ queryKey: financeQueryKeys.dashboard(userId) });
}
