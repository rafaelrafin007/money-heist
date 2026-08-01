import {
  budgetFormToInsert,
  budgetFormToUpdate,
  budgetRowToDomain,
  type BudgetFormValues,
  type BudgetRow,
  type BudgetUpdateValues,
} from "@/src/features/budgets/api/budgetMappers";
import { getCalendarMonthRange, shiftCalendarMonth } from "@/src/features/finance/dates";
import { getAuthenticatedUserId, toRepositoryError } from "@/src/features/finance/api/repositoryUtils";
import type { Category } from "@/src/features/finance/types";
import { getSupabaseClient } from "@/src/lib/supabase";

const budgetColumns =
  "id, user_id, category_id, period_start, period_end, limit_minor, currency_code, status, created_at, updated_at";

export async function listBudgetsForMonth(monthStart: string) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const range = getCalendarMonthRange(monthStart);
    const { data, error } = await supabase
      .from("budgets")
      .select(budgetColumns)
      .eq("user_id", userId)
      .eq("period_start", range.start)
      .eq("period_end", range.end)
      .order("status", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return ((data ?? []) as BudgetRow[]).map(budgetRowToDomain);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function getBudgetById(budgetId: string) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("budgets")
      .select(budgetColumns)
      .eq("user_id", userId)
      .eq("id", budgetId)
      .single();

    if (error) throw error;
    return budgetRowToDomain(data as BudgetRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function createBudget(values: BudgetFormValues, categories: Category[]) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("budgets")
      .insert(budgetFormToInsert(values, userId, categories))
      .select(budgetColumns)
      .single();

    if (error) throw error;
    return budgetRowToDomain(data as BudgetRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function updateBudget(budgetId: string, values: BudgetUpdateValues) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("budgets")
      .update(budgetFormToUpdate(values))
      .eq("user_id", userId)
      .eq("id", budgetId)
      .select(budgetColumns)
      .single();

    if (error) throw error;
    return budgetRowToDomain(data as BudgetRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function archiveBudget(budgetId: string) {
  return setBudgetStatus(budgetId, "archived");
}

export async function restoreBudget(budgetId: string) {
  return setBudgetStatus(budgetId, "active");
}

export async function copyBudgetsFromMonth(targetMonthStart: string) {
  try {
    const supabase = getSupabaseClient();
    await getAuthenticatedUserId();
    const sourceMonthStart = shiftCalendarMonth(targetMonthStart, -1);
    const { data, error } = await supabase.rpc("copy_budgets_from_month", {
      source_month_start: sourceMonthStart,
      target_month_start: targetMonthStart,
    });

    if (error) throw error;
    return typeof data === "number" ? data : 0;
  } catch (error) {
    throw toRepositoryError(error);
  }
}

async function setBudgetStatus(budgetId: string, status: "active" | "archived") {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("budgets")
      .update({ status })
      .eq("user_id", userId)
      .eq("id", budgetId)
      .select(budgetColumns)
      .single();

    if (error) throw error;
    return budgetRowToDomain(data as BudgetRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}
