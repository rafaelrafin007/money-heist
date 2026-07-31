import {
  accountFormToInsert,
  accountFormToUpdate,
  accountRowToDomain,
  type AccountFormValues,
  type AccountRow,
  type AccountUpdateValues,
} from "@/src/features/finance/api/databaseMappers";
import { getAuthenticatedUserId, toRepositoryError } from "@/src/features/finance/api/repositoryUtils";
import { getSupabaseClient } from "@/src/lib/supabase";

const accountColumns =
  "id, user_id, name, account_type, currency_code, opening_balance_minor, is_savings, is_archived, created_at, updated_at";

export async function listAccounts() {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("accounts")
      .select(accountColumns)
      .eq("user_id", userId)
      .order("is_archived", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return ((data ?? []) as AccountRow[]).map(accountRowToDomain);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function getAccountById(accountId: string) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("accounts")
      .select(accountColumns)
      .eq("user_id", userId)
      .eq("id", accountId)
      .single();

    if (error) throw error;
    return accountRowToDomain(data as AccountRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function createAccount(values: AccountFormValues) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("accounts")
      .insert(accountFormToInsert(values, userId))
      .select(accountColumns)
      .single();

    if (error) throw error;
    return accountRowToDomain(data as AccountRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function updateAccount(accountId: string, values: AccountUpdateValues) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("accounts")
      .update(accountFormToUpdate(values))
      .eq("user_id", userId)
      .eq("id", accountId)
      .select(accountColumns)
      .single();

    if (error) throw error;
    return accountRowToDomain(data as AccountRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function archiveAccount(accountId: string) {
  return setAccountArchiveState(accountId, true);
}

export async function restoreAccount(accountId: string) {
  return setAccountArchiveState(accountId, false);
}

async function setAccountArchiveState(accountId: string, isArchived: boolean) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("accounts")
      .update({ is_archived: isArchived })
      .eq("user_id", userId)
      .eq("id", accountId)
      .select(accountColumns)
      .single();

    if (error) throw error;
    return accountRowToDomain(data as AccountRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}
