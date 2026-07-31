import { toSafeAuthErrorMessage } from "@/src/features/auth/authErrors";
import { getSupabaseClient } from "@/src/lib/supabase";

export async function getAuthenticatedUserId() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(toSafeAuthErrorMessage(error));
  }

  if (!data.user) {
    throw new Error("You must be signed in to access finance records.");
  }

  return data.user.id;
}

export function toRepositoryError(error: unknown) {
  const message = error instanceof Error ? error.message : "The request could not be completed.";
  const lower = message.toLowerCase();

  if (lower.includes("duplicate") || lower.includes("unique")) {
    return new Error("A similar record already exists.");
  }

  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return new Error("You do not have permission to access that record.");
  }

  if (lower.includes("foreign key")) {
    return new Error("The selected account or category is no longer available.");
  }

  if (lower.includes("currency")) {
    return new Error("Currency mismatch. Choose accounts with the same currency.");
  }

  return new Error(message);
}
