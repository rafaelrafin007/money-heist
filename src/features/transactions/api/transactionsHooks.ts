import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAccounts } from "@/src/features/accounts/api/accountsHooks";
import { useCategories } from "@/src/features/categories/api/categoriesHooks";
import type { TransactionFormValues } from "@/src/features/finance/api/databaseMappers";
import { financeQueryKeys } from "@/src/features/finance/api/queryKeys";
import type { Transaction } from "@/src/features/finance/types";
import {
  cancelTransaction,
  createTransaction,
  getTransactionById,
  listTransactions,
  restoreTransaction,
  updateTransaction,
} from "@/src/features/transactions/api/transactionsRepository";
import { useAuth } from "@/src/providers/AuthProvider";

export function useTransactions() {
  const { user, isInitializing } = useAuth();
  return useQuery({
    queryKey: financeQueryKeys.transactions(user?.id ?? "anonymous"),
    queryFn: listTransactions,
    enabled: Boolean(user?.id) && !isInitializing,
  });
}

export function useTransaction(transactionId?: string) {
  const { user, isInitializing } = useAuth();
  return useQuery({
    queryKey: financeQueryKeys.transaction(user?.id ?? "anonymous", transactionId ?? "missing"),
    queryFn: () => getTransactionById(transactionId ?? ""),
    enabled: Boolean(user?.id && transactionId) && !isInitializing,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const accounts = useAccounts();
  const categories = useCategories();
  return useMutation({
    mutationFn: (values: TransactionFormValues) =>
      createTransaction(values, accounts.data ?? [], categories.data ?? []),
    onSuccess: () => invalidateFinanceAfterTransaction(queryClient, user?.id),
  });
}

export function useUpdateTransaction(transactionId: string, existing?: Transaction) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const accounts = useAccounts();
  const categories = useCategories();
  return useMutation({
    mutationFn: (values: TransactionFormValues) => {
      if (!existing) {
        throw new Error("Transaction is not loaded yet.");
      }
      return updateTransaction(transactionId, values, existing, accounts.data ?? [], categories.data ?? []);
    },
    onSuccess: () => {
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: financeQueryKeys.transaction(user.id, transactionId) });
        invalidateFinanceAfterTransaction(queryClient, user.id);
      }
    },
  });
}

export function useCancelTransaction(transactionId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: () => cancelTransaction(transactionId),
    onSuccess: () => invalidateFinanceAfterTransaction(queryClient, user?.id),
  });
}

export function useRestoreTransaction(transactionId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: () => restoreTransaction(transactionId),
    onSuccess: () => invalidateFinanceAfterTransaction(queryClient, user?.id),
  });
}

function invalidateFinanceAfterTransaction(queryClient: ReturnType<typeof useQueryClient>, userId?: string) {
  if (!userId) return;
  void queryClient.invalidateQueries({ queryKey: financeQueryKeys.all(userId) });
}
