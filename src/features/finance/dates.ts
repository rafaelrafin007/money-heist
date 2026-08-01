export type DateRange = {
  start: string;
  end: string;
};

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentCalendarMonth(referenceDate = new Date()): DateRange {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  return {
    start: toIsoDate(new Date(year, month, 1)),
    end: toIsoDate(new Date(year, month + 1, 0)),
  };
}

export function getCalendarMonthRange(monthStart: string): DateRange {
  assertFirstDayOfMonth(monthStart);
  const [year, month] = monthStart.split("-").map(Number);
  return {
    start: monthStart,
    end: toIsoDate(new Date(year, month, 0)),
  };
}

export function shiftCalendarMonth(monthStart: string, offsetMonths: number) {
  assertFirstDayOfMonth(monthStart);
  const [year, month] = monthStart.split("-").map(Number);
  return toIsoDate(new Date(year, month - 1 + offsetMonths, 1));
}

export function shiftIsoDate(isoDate: string, offsetDays: number) {
  assertIsoDate(isoDate);
  const [year, month, day] = isoDate.split("-").map(Number);
  return toIsoDate(new Date(year, month - 1, day + offsetDays));
}

export function assertFirstDayOfMonth(value: string) {
  if (!/^\d{4}-\d{2}-01$/.test(value) || !isValidCalendarDate(value)) {
    throw new Error("Month must be a valid first-day-of-month date.");
  }
  return value;
}

export function assertIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !isValidCalendarDate(value)) {
    throw new Error("Date must be a valid YYYY-MM-DD date.");
  }
  return value;
}

export function isIsoDateInRange(date: string, range: DateRange) {
  return date >= range.start && date <= range.end;
}

export function monthLabel(isoDate: string, locale = "en-BD") {
  const [year, month] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}

export function daysRemainingInPeriod(range: DateRange, referenceDate = new Date()) {
  const today = toIsoDate(referenceDate);

  if (today > range.end) {
    return 0;
  }

  const effectiveStart = today < range.start ? range.start : today;
  const startDate = new Date(`${effectiveStart}T00:00:00`);
  const endDate = new Date(`${range.end}T00:00:00`);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerDay) + 1);
}

function isValidCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
