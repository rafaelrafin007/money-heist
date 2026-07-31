export const financeQueryKeys = {
  all: (userId: string) => ["finance", userId] as const,
  accounts: (userId: string) => ["finance", userId, "accounts"] as const,
  account: (userId: string, accountId: string) => ["finance", userId, "accounts", accountId] as const,
  categories: (userId: string) => ["finance", userId, "categories"] as const,
  transactions: (userId: string) => ["finance", userId, "transactions"] as const,
  transaction: (userId: string, transactionId: string) => ["finance", userId, "transactions", transactionId] as const,
  dashboard: (userId: string) => ["finance", userId, "dashboard"] as const,
};

export function getFinanceCachePrefix(userId: string) {
  return financeQueryKeys.all(userId);
}
