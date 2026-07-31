import {
  transactionFormToInsert,
  transactionFormToUpdate,
  transactionRowToDomain,
  type TransactionFormValues,
  type TransactionRow,
} from "@/src/features/finance/api/databaseMappers";
import { getAuthenticatedUserId, toRepositoryError } from "@/src/features/finance/api/repositoryUtils";
import type { Account, Category, Transaction } from "@/src/features/finance/types";
import { getSupabaseClient } from "@/src/lib/supabase";

const transactionColumns =
  "id, user_id, transaction_type, amount_minor, currency_code, account_id, destination_account_id, category_id, occurred_at, note, transaction_status, created_at, updated_at";

export async function listTransactions() {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("transactions")
      .select(transactionColumns)
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return ((data ?? []) as TransactionRow[]).map(transactionRowToDomain);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function getTransactionById(transactionId: string) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("transactions")
      .select(transactionColumns)
      .eq("user_id", userId)
      .eq("id", transactionId)
      .single();

    if (error) throw error;
    return transactionRowToDomain(data as TransactionRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function createTransaction(values: TransactionFormValues, accounts: Account[], categories: Category[]) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("transactions")
      .insert(transactionFormToInsert(values, userId, accounts, categories))
      .select(transactionColumns)
      .single();

    if (error) throw error;
    return transactionRowToDomain(data as TransactionRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function updateTransaction(
  transactionId: string,
  values: TransactionFormValues,
  existing: Transaction,
  accounts: Account[],
  categories: Category[],
) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("transactions")
      .update(transactionFormToUpdate(values, existing, accounts, categories))
      .eq("user_id", userId)
      .eq("id", transactionId)
      .select(transactionColumns)
      .single();

    if (error) throw error;
    return transactionRowToDomain(data as TransactionRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function cancelTransaction(transactionId: string) {
  return setTransactionStatus(transactionId, "cancelled");
}

export async function restoreTransaction(transactionId: string) {
  return setTransactionStatus(transactionId, "active");
}

async function setTransactionStatus(transactionId: string, status: "active" | "cancelled") {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("transactions")
      .update({ transaction_status: status })
      .eq("user_id", userId)
      .eq("id", transactionId)
      .select(transactionColumns)
      .single();

    if (error) throw error;
    return transactionRowToDomain(data as TransactionRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}
