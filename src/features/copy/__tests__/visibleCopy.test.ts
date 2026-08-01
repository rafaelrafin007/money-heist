import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { toSafeAuthErrorMessage } from "@/src/features/auth/authErrors";

const activeUiFiles = [
  "app/_layout.tsx",
  "app/(app)/accounts/[id]/edit.tsx",
  "app/(app)/transactions/[id]/edit.tsx",
  "src/features/accounts/screens/AccountDetailScreen.tsx",
  "src/features/accounts/screens/AccountFormScreen.tsx",
  "src/features/accounts/screens/AccountsListScreen.tsx",
  "src/features/auth/screens/ForgotPasswordScreen.tsx",
  "src/features/auth/screens/ResetPasswordScreen.tsx",
  "src/features/auth/screens/SignInScreen.tsx",
  "src/features/auth/screens/SignUpScreen.tsx",
  "src/features/budgets/BudgetFormScreen.tsx",
  "src/features/budgets/BudgetsScreen.tsx",
  "src/features/categories/screens/CategoriesScreen.tsx",
  "src/features/insights/components/DashboardOverview.tsx",
  "src/features/planning/PlanningScreen.tsx",
  "src/features/savings/SavingsGoalFormScreen.tsx",
  "src/features/savings/SavingsScreen.tsx",
  "src/features/settings/SettingsScreen.tsx",
  "src/features/transactions/TransactionsScreen.tsx",
  "src/features/transactions/components/QuickEntryActions.tsx",
  "src/features/transactions/screens/TransactionDetailScreen.tsx",
  "src/features/transactions/screens/TransactionFormScreen.tsx",
];

const forbiddenVisibleTerms = [
  /supabase/i,
  /\bdemo\b/i,
  /\bmock\b/i,
  /\bplaceholder\b/i,
  /real data/i,
  /real accounting/i,
  /calculated through/i,
  /development preview/i,
  /not persisted/i,
  /not connected/i,
];

function stringLiteralsFrom(source: string) {
  const matches = source.matchAll(/(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g);
  return Array.from(matches, (match) => match[2]);
}

describe("visible production copy", () => {
  it("does not expose development or implementation wording in active UI strings", () => {
    const violations = activeUiFiles.flatMap((filePath) => {
      const source = readFileSync(join(process.cwd(), filePath), "utf8");
      return stringLiteralsFrom(source)
        .filter((literal) => forbiddenVisibleTerms.some((term) => term.test(literal)))
        .map((literal) => `${filePath}: ${literal}`);
    });

    expect(violations).toEqual([]);
  });

  it("maps authentication errors to safe user-facing messages", () => {
    expect(toSafeAuthErrorMessage(new Error("row-level security policy violation"))).toBe(
      "Authentication could not be completed. Please try again.",
    );
  });
});
