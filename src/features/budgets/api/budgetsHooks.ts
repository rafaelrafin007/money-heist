import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useCategories } from "@/src/features/categories/api/categoriesHooks";
import {
  archiveBudget,
  copyBudgetsFromMonth,
  createBudget,
  getBudgetById,
  listBudgetsForMonth,
  restoreBudget,
  updateBudget,
} from "@/src/features/budgets/api/budgetsRepository";
import type { BudgetFormValues, BudgetUpdateValues } from "@/src/features/budgets/api/budgetMappers";
import { financeQueryKeys } from "@/src/features/finance/api/queryKeys";
import { useAuth } from "@/src/providers/AuthProvider";

export function useBudgetsForMonth(monthStart: string) {
  const { user, isInitializing } = useAuth();
  return useQuery({
    queryKey: financeQueryKeys.budgets(user?.id ?? "anonymous", monthStart),
    queryFn: () => listBudgetsForMonth(monthStart),
    enabled: Boolean(user?.id && monthStart) && !isInitializing,
  });
}

export function useBudget(budgetId?: string) {
  const { user, isInitializing } = useAuth();
  return useQuery({
    queryKey: financeQueryKeys.budget(user?.id ?? "anonymous", budgetId ?? "missing"),
    queryFn: () => getBudgetById(budgetId ?? ""),
    enabled: Boolean(user?.id && budgetId) && !isInitializing,
  });
}

export function useCreateBudget(monthStart: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const categories = useCategories();
  return useMutation({
    mutationFn: (values: BudgetFormValues) => createBudget(values, categories.data ?? []),
    onSuccess: () => invalidateBudgetPlanning(queryClient, user?.id, monthStart),
  });
}

export function useUpdateBudget(budgetId: string, monthStart: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (values: BudgetUpdateValues) => updateBudget(budgetId, values),
    onSuccess: () => {
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: financeQueryKeys.budget(user.id, budgetId) });
      }
      invalidateBudgetPlanning(queryClient, user?.id, monthStart);
    },
  });
}

export function useArchiveBudget(budgetId: string, monthStart: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: () => archiveBudget(budgetId),
    onSuccess: () => invalidateBudgetPlanning(queryClient, user?.id, monthStart),
  });
}

export function useRestoreBudget(budgetId: string, monthStart: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: () => restoreBudget(budgetId),
    onSuccess: () => invalidateBudgetPlanning(queryClient, user?.id, monthStart),
  });
}

export function useCopyBudgets(monthStart: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: () => copyBudgetsFromMonth(monthStart),
    onSuccess: () => invalidateBudgetPlanning(queryClient, user?.id, monthStart),
  });
}

function invalidateBudgetPlanning(queryClient: ReturnType<typeof useQueryClient>, userId?: string, monthStart?: string) {
  if (!userId) return;
  if (monthStart) {
    void queryClient.invalidateQueries({ queryKey: financeQueryKeys.budgets(userId, monthStart) });
  }
  void queryClient.invalidateQueries({ queryKey: financeQueryKeys.dashboard(userId) });
  void queryClient.invalidateQueries({ queryKey: ["finance", userId, "planning"] });
}
