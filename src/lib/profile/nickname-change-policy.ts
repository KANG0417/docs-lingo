import { NICKNAME_CHANGE_COOLDOWN_DAYS } from "@/constants/nickname-change";

export interface NicknameChangePolicy {
  nextChangeAt: string | null;
}

export const addCalendarDays = (date: Date, days: number): Date => {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

export const computeNicknameNextChangeAt = (
  lastChangedAt: Date,
): Date => {
  return addCalendarDays(lastChangedAt, NICKNAME_CHANGE_COOLDOWN_DAYS);
};

export const isNicknameChangeAllowedAt = (nextChangeAt: Date | null): boolean => {
  if (!nextChangeAt) {
    return true;
  }

  return nextChangeAt.getTime() <= Date.now();
};

export const formatNicknameNextChangeAt = (isoDate: string): string => {
  const date = new Date(isoDate);
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("year")}년 ${getPart("month")}월 ${getPart("day")}일`;
};

export const buildNicknameChangeCooldownMessage = (nextChangeAtIso: string): string => {
  return `닉네임은 ${NICKNAME_CHANGE_COOLDOWN_DAYS}일에 한 번만 변경할 수 있습니다.\n${formatNicknameNextChangeAt(nextChangeAtIso)} 이후에 다시 변경할 수 있습니다.`;
};

export const isNicknameChangeLocked = (
  nextChangeAtIso: string | null,
): boolean => {
  if (!nextChangeAtIso) {
    return false;
  }

  return !isNicknameChangeAllowedAt(new Date(nextChangeAtIso));
};

export const resolveNicknameChangePolicy = (
  lastChangedAtIso: string | null,
): NicknameChangePolicy => {
  if (!lastChangedAtIso) {
    return { nextChangeAt: null };
  }

  const nextChangeAt = computeNicknameNextChangeAt(new Date(lastChangedAtIso));

  if (isNicknameChangeAllowedAt(nextChangeAt)) {
    return { nextChangeAt: null };
  }

  return { nextChangeAt: nextChangeAt.toISOString() };
};
