import { HISTORY_DATE_RANGE_MONTHS } from "@/constants/translation-history";
import { getTranslationDayRange } from "@/lib/translation/history/translation-day-range";

const KST_TIMEZONE = "Asia/Seoul";

export interface HistoryDateOption {
  dateKey: string;
  label: string;
}

export const dateKeyToDate = (dateKey: string): Date => {
  return new Date(`${dateKey}T12:00:00+09:00`);
};

const parseDateKeyParts = (
  dateKey: string,
): { year: number; month: number; day: number } => {
  const [year, month, day] = dateKey.split("-").map(Number);

  return { year, month, day };
};

const getLastDayOfMonth = (year: number, month: number): number => {
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const firstOfNextMonth = dateKeyToDate(
    `${nextMonthYear}-${String(nextMonth).padStart(2, "0")}-01`,
  );
  const lastDayDate = new Date(firstOfNextMonth.getTime());
  lastDayDate.setDate(lastDayDate.getDate() - 1);

  return Number(getTranslationDayRange(lastDayDate).dateKey.slice(8, 10));
};

/** 달력 기준 N개월 전 같은 날(말일 보정 포함, KST) */
export const subtractCalendarMonths = (
  date: Date,
  months: number,
): Date => {
  const { dateKey } = getTranslationDayRange(date);
  const { year, month, day } = parseDateKeyParts(dateKey);

  let targetYear = year;
  let targetMonth = month - months;

  while (targetMonth <= 0) {
    targetMonth += 12;
    targetYear -= 1;
  }

  const lastDayOfTargetMonth = getLastDayOfMonth(targetYear, targetMonth);
  const targetDay = Math.min(day, lastDayOfTargetMonth);
  const paddedMonth = String(targetMonth).padStart(2, "0");
  const paddedDay = String(targetDay).padStart(2, "0");

  return dateKeyToDate(`${targetYear}-${paddedMonth}-${paddedDay}`);
};

export const getHistoryMinDateKey = (): string => {
  const todayRange = getTranslationDayRange();
  const minDate = subtractCalendarMonths(
    dateKeyToDate(todayRange.dateKey),
    HISTORY_DATE_RANGE_MONTHS,
  );

  return getTranslationDayRange(minDate).dateKey;
};

const formatKstDateLabel = (dateKey: string, isToday: boolean): string => {
  const date = new Date(`${dateKey}T12:00:00+09:00`);
  const formatted = new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);

  return isToday ? `${formatted} (오늘)` : formatted;
};

export const buildHistoryDateOptions = (): HistoryDateOption[] => {
  const todayRange = getTranslationDayRange();
  const minDateKey = getHistoryMinDateKey();
  const options: HistoryDateOption[] = [];
  let cursor = dateKeyToDate(todayRange.dateKey);

  while (true) {
    const { dateKey } = getTranslationDayRange(cursor);

    options.push({
      dateKey,
      label: formatKstDateLabel(dateKey, dateKey === todayRange.dateKey),
    });

    if (dateKey === minDateKey) {
      break;
    }

    const previousDay = new Date(cursor.getTime());
    previousDay.setDate(previousDay.getDate() - 1);
    cursor = previousDay;
  }

  return options;
};

export const isValidHistoryDateKey = (dateKey: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return false;
  }

  const todayRange = getTranslationDayRange();
  const minDateKey = getHistoryMinDateKey();

  return dateKey >= minDateKey && dateKey <= todayRange.dateKey;
};

export const dateToDateKey = (date: Date): string => {
  return getTranslationDayRange(date).dateKey;
};

export const getHistoryDateBounds = (): { minDate: Date; maxDate: Date } => {
  const todayRange = getTranslationDayRange();
  const maxDate = dateKeyToDate(todayRange.dateKey);
  const minDate = subtractCalendarMonths(maxDate, HISTORY_DATE_RANGE_MONTHS);

  return {
    minDate: dateKeyToDate(getTranslationDayRange(minDate).dateKey),
    maxDate,
  };
};

export const formatHistoryListDate = (createdAt: string): string => {
  const date = new Date(createdAt);

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST_TIMEZONE,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};
