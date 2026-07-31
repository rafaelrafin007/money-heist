import {
  categoryFormToInsert,
  categoryFormToUpdate,
  categoryRowToDomain,
  type CategoryFormValues,
  type CategoryRow,
} from "@/src/features/finance/api/databaseMappers";
import { getAuthenticatedUserId, toRepositoryError } from "@/src/features/finance/api/repositoryUtils";
import { getSupabaseClient } from "@/src/lib/supabase";

const categoryColumns =
  "id, user_id, name, category_type, icon_name, is_system, is_archived, created_at, updated_at";

export async function listCategories() {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("categories")
      .select(categoryColumns)
      .eq("user_id", userId)
      .order("category_type", { ascending: true })
      .order("is_archived", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return ((data ?? []) as CategoryRow[]).map(categoryRowToDomain);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function createCategory(values: CategoryFormValues) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("categories")
      .insert(categoryFormToInsert(values, userId))
      .select(categoryColumns)
      .single();

    if (error) throw error;
    return categoryRowToDomain(data as CategoryRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function updateCategory(categoryId: string, values: Pick<CategoryFormValues, "name" | "iconName">) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("categories")
      .update(categoryFormToUpdate(values))
      .eq("user_id", userId)
      .eq("id", categoryId)
      .select(categoryColumns)
      .single();

    if (error) throw error;
    return categoryRowToDomain(data as CategoryRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}

export async function archiveCategory(categoryId: string) {
  return setCategoryArchiveState(categoryId, true);
}

export async function restoreCategory(categoryId: string) {
  return setCategoryArchiveState(categoryId, false);
}

export async function initializeDefaultCategories() {
  try {
    const supabase = getSupabaseClient();
    await getAuthenticatedUserId();
    const { error } = await supabase.rpc("initialize_default_categories");

    if (error) throw error;
    return listCategories();
  } catch (error) {
    throw toRepositoryError(error);
  }
}

async function setCategoryArchiveState(categoryId: string, isArchived: boolean) {
  try {
    const supabase = getSupabaseClient();
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase
      .from("categories")
      .update({ is_archived: isArchived })
      .eq("user_id", userId)
      .eq("id", categoryId)
      .select(categoryColumns)
      .single();

    if (error) throw error;
    return categoryRowToDomain(data as CategoryRow);
  } catch (error) {
    throw toRepositoryError(error);
  }
}
