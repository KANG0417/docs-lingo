export const formatWithdrawalScheduledAt = (isoDate: string): string => {
  const date = new Date(isoDate);
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("year")}년 ${getPart("month")}월 ${getPart("day")}일 ${getPart("hour")}시 ${getPart("minute")}분 ${getPart("second")}초`;
};

export const computeWithdrawalScheduledAtIso = (): string =>
  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
