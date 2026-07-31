import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveAccount,
  createAccount,
  getAccountById,
  listAccounts,
  restoreAccount,
  updateAccount,
} from "@/src/features/accounts/api/accountsRepository";
import type { AccountFormValues, AccountUpdateValues } from "@/src/features/finance/api/databaseMappers";
import { financeQueryKeys } from "@/src/features/finance/api/queryKeys";
import { useAuth } from "@/src/providers/AuthProvider";

export function useAccounts() {
  const { user, isInitializing } = useAuth();
  return useQuery({
    queryKey: financeQueryKeys.accounts(user?.id ?? "anonymous"),
    queryFn: listAccounts,
    enabled: Boolean(user?.id) && !isInitializing,
  });
}

export function useAccount(accountId?: string) {
  const { user, isInitializing } = useAuth();
  return useQuery({
    queryKey: financeQueryKeys.account(user?.id ?? "anonymous", accountId ?? "missing"),
    queryFn: () => getAccountById(accountId ?? ""),
    enabled: Boolean(user?.id && accountId) && !isInitializing,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (values: AccountFormValues) => createAccount(values),
    onSuccess: () => {
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: financeQueryKeys.accounts(user.id) });
        void queryClient.invalidateQueries({ queryKey: financeQueryKeys.dashboard(user.id) });
      }
    },
  });
}

export function useUpdateAccount(accountId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (values: AccountUpdateValues) => updateAccount(accountId, values),
    onSuccess: () => {
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: financeQueryKeys.accounts(user.id) });
        void queryClient.invalidateQueries({ queryKey: financeQueryKeys.account(user.id, accountId) });
        void queryClient.invalidateQueries({ queryKey: financeQueryKeys.dashboard(user.id) });
      }
    },
  });
}

export function useArchiveAccount(accountId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: () => archiveAccount(accountId),
    onSuccess: () => {
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: financeQueryKeys.accounts(user.id) });
        void queryClient.invalidateQueries({ queryKey: financeQueryKeys.dashboard(user.id) });
      }
    },
  });
}

export function useRestoreAccount(accountId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: () => restoreAccount(accountId),
    onSuccess: () => {
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: financeQueryKeys.accounts(user.id) });
        void queryClient.invalidateQueries({ queryKey: financeQueryKeys.dashboard(user.id) });
      }
    },
  });
}
