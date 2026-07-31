import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveCategory,
  createCategory,
  initializeDefaultCategories,
  listCategories,
  restoreCategory,
  updateCategory,
} from "@/src/features/categories/api/categoriesRepository";
import type { CategoryFormValues } from "@/src/features/finance/api/databaseMappers";
import { financeQueryKeys } from "@/src/features/finance/api/queryKeys";
import { useAuth } from "@/src/providers/AuthProvider";

export function useCategories() {
  const { user, isInitializing } = useAuth();
  return useQuery({
    queryKey: financeQueryKeys.categories(user?.id ?? "anonymous"),
    queryFn: listCategories,
    enabled: Boolean(user?.id) && !isInitializing,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (values: CategoryFormValues) => createCategory(values),
    onSuccess: () => invalidateCategories(queryClient, user?.id),
  });
}

export function useUpdateCategory(categoryId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (values: Pick<CategoryFormValues, "name" | "iconName">) => updateCategory(categoryId, values),
    onSuccess: () => invalidateCategories(queryClient, user?.id),
  });
}

export function useArchiveCategory(categoryId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: () => archiveCategory(categoryId),
    onSuccess: () => invalidateCategories(queryClient, user?.id),
  });
}

export function useRestoreCategory(categoryId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: () => restoreCategory(categoryId),
    onSuccess: () => invalidateCategories(queryClient, user?.id),
  });
}

export function useInitializeDefaultCategories() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: initializeDefaultCategories,
    onSuccess: () => invalidateCategories(queryClient, user?.id),
  });
}

function invalidateCategories(queryClient: ReturnType<typeof useQueryClient>, userId?: string) {
  if (!userId) return;
  void queryClient.invalidateQueries({ queryKey: financeQueryKeys.categories(userId) });
  void queryClient.invalidateQueries({ queryKey: financeQueryKeys.dashboard(userId) });
}
