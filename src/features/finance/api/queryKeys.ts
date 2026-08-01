export const financeQueryKeys = {
  all: (userId: string) => ["finance", userId] as const,
  accounts: (userId: string) => ["finance", userId, "accounts"] as const,
  account: (userId: string, accountId: string) => ["finance", userId, "accounts", accountId] as const,
  categories: (userId: string) => ["finance", userId, "categories"] as const,
  transactions: (userId: string) => ["finance", userId, "transactions"] as const,
  transaction: (userId: string, transactionId: string) => ["finance", userId, "transactions", transactionId] as const,
  budgets: (userId: string, monthStart: string) => ["finance", userId, "budgets", monthStart] as const,
  budget: (userId: string, budgetId: string) => ["finance", userId, "budgets", "detail", budgetId] as const,
  savingsGoals: (userId: string) => ["finance", userId, "savings-goals"] as const,
  savingsGoal: (userId: string, goalId: string) => ["finance", userId, "savings-goals", goalId] as const,
  monthlyPlan: (userId: string, monthStart: string, currency: string) => ["finance", userId, "monthly-plan", monthStart, currency] as const,
  planning: (userId: string, monthStart: string, currency: string) => ["finance", userId, "planning", monthStart, currency] as const,
  dashboard: (userId: string) => ["finance", userId, "dashboard"] as const,
};

export function getFinanceCachePrefix(userId: string) {
  return financeQueryKeys.all(userId);
}
