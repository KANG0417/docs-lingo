const KST_TIMEZONE = "Asia/Seoul";

interface TranslationDayRange {
  startIso: string;
  endIso: string;
  dateKey: string;
}

const getKstDateKey = (date: Date): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export const getTranslationDayRange = (
  referenceDate: Date = new Date(),
): TranslationDayRange => {
  const dateKey = getKstDateKey(referenceDate);

  return {
    dateKey,
    startIso: `${dateKey}T00:00:00+09:00`,
    endIso: `${dateKey}T23:59:59.999+09:00`,
  };
};
