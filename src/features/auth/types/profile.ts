export type UserProfile = {
  id: string;
  fullName: string | null;
  currencyCode: string;
  timezone: string;
  financialMonthStartDay: number;
  createdAt: string;
  updatedAt: string;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  currency_code: string;
  timezone: string;
  financial_month_start_day: number;
  created_at: string;
  updated_at: string;
};

export function mapProfileRow(row: unknown): UserProfile {
  if (!isRecord(row)) {
    throw new Error("Profile row is missing.");
  }

  const id = readString(row, "id");
  const currencyCode = readString(row, "currency_code");
  const timezone = readString(row, "timezone");
  const financialMonthStartDay = readNumber(row, "financial_month_start_day");
  const createdAt = readString(row, "created_at");
  const updatedAt = readString(row, "updated_at");
  const fullName = row.full_name === null ? null : readString(row, "full_name");

  return {
    id,
    fullName: fullName ? fullName.trim() : null,
    currencyCode,
    timezone,
    financialMonthStartDay,
    createdAt,
    updatedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(row: Record<string, unknown>, key: keyof ProfileRow) {
  const value = row[key];

  if (typeof value !== "string") {
    throw new Error(`Profile field ${String(key)} is invalid.`);
  }

  return value;
}

function readNumber(row: Record<string, unknown>, key: keyof ProfileRow) {
  const value = row[key];

  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`Profile field ${String(key)} is invalid.`);
  }

  return value;
}
