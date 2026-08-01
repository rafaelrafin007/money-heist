import {
  savingsGoalFormToInsert,
  savingsGoalFormToUpdate,
  savingsGoalRowToDomain,
  savingsGoalStatusToUpdate,
  type SavingsGoalFormValues,
  type SavingsGoalRow,
  type SavingsGoalUpdateValues,
} from "@/src/features/savings/api/savingsGoalMappers";
import { getAuthenticatedUserId, toRepositoryError } from "@/src/features/finance/api/repositoryUtils";
import type { Account, SavingsGoal, SavingsGoalStatus } from "@/src/features/finance/types";
import { getSupabaseClient } from "@/src/lib/supabase";

const savingsGoalColumns =
  "id, user_id, name, target_minor, currency_code, current_amount_minor, target_date, status, linked_account_id, created_at, updated_at";

export async function listSavingsGoals() {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("savings_goals")
      .select(savingsGoalColumns)
      .eq("user_id", userId)
      .order("status", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return ((data ?? []) as SavingsGoalRow[]).map(savingsGoalRowToDomain);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function getSavingsGoalById(goalId: string) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("savings_goals")
      .select(savingsGoalColumns)
      .eq("user_id", userId)
      .eq("id", goalId)
      .single();

    if (error) throw error;
    return savingsGoalRowToDomain(data as SavingsGoalRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function createSavingsGoal(values: SavingsGoalFormValues, accounts: Account[], goals: SavingsGoal[]) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("savings_goals")
      .insert(savingsGoalFormToInsert(values, userId, accounts, goals))
      .select(savingsGoalColumns)
      .single();

    if (error) throw error;
    return savingsGoalRowToDomain(data as SavingsGoalRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function updateSavingsGoal(
  goalId: string,
  values: SavingsGoalUpdateValues,
  accounts: Account[],
  goals: SavingsGoal[],
) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("savings_goals")
      .update(savingsGoalFormToUpdate(values, goalId, accounts, goals))
      .eq("user_id", userId)
      .eq("id", goalId)
      .select(savingsGoalColumns)
      .single();

    if (error) throw error;
    return savingsGoalRowToDomain(data as SavingsGoalRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function setSavingsGoalStatus(goalId: string, status: SavingsGoalStatus) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("savings_goals")
      .update(savingsGoalStatusToUpdate(status))
      .eq("user_id", userId)
      .eq("id", goalId)
      .select(savingsGoalColumns)
      .single();

    if (error) throw error;
    return savingsGoalRowToDomain(data as SavingsGoalRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}
