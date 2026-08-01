import {
  monthlyFinancePlanFormToUpsert,
  monthlyFinancePlanRowToDomain,
  type MonthlyFinancePlanFormValues,
  type MonthlyFinancePlanRow,
} from "@/src/features/planning/api/monthlyFinancePlanMappers";
import { getAuthenticatedUserId, toRepositoryError } from "@/src/features/finance/api/repositoryUtils";
import { getSupabaseClient } from "@/src/lib/supabase";

const monthlyPlanColumns =
  "id, user_id, month_start, currency_code, expected_remaining_income_minor, upcoming_fixed_expenses_minor, debt_obligations_minor, safety_buffer_minor, notes, created_at, updated_at";

export async function getMonthlyFinancePlan(monthStart: string, currency: string) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("monthly_finance_plans")
      .select(monthlyPlanColumns)
      .eq("user_id", userId)
      .eq("month_start", monthStart)
      .eq("currency_code", currency)
      .maybeSingle();

    if (error) throw error;
    return data ? monthlyFinancePlanRowToDomain(data as MonthlyFinancePlanRow) : null;
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function upsertMonthlyFinancePlan(values: MonthlyFinancePlanFormValues) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("monthly_finance_plans")
      .upsert(monthlyFinancePlanFormToUpsert(values, userId), {
        onConflict: "user_id,month_start,currency_code",
      })
      .select(monthlyPlanColumns)
      .single();

    if (error) throw error;
    return monthlyFinancePlanRowToDomain(data as MonthlyFinancePlanRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}
