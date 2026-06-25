const KOREA_TIME_OFFSET_MS = 9 * 60 * 60 * 1000;
const MILLISECONDS_PER_SECOND = 1000;

interface ResolveSessionExpiresAtParams {
  issuedAt?: number;
  existingExpiresAt?: number;
  maxAgeSeconds?: number;
  nowMs?: number;
}

export const getNextKoreanMidnightEpochSeconds = (
  baseTimeMs: number = Date.now(),
): number => {
  const koreaTime = new Date(baseTimeMs + KOREA_TIME_OFFSET_MS);
  const nextMidnightInKoreaAsUtc = Date.UTC(
    koreaTime.getUTCFullYear(),
    koreaTime.getUTCMonth(),
    koreaTime.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );

  return Math.floor(
    (nextMidnightInKoreaAsUtc - KOREA_TIME_OFFSET_MS) /
      MILLISECONDS_PER_SECOND,
  );
};

export const getNextKoreanMidnightFromEpochSeconds = (
  epochSeconds: number,
): number => {
  return getNextKoreanMidnightEpochSeconds(
    epochSeconds * MILLISECONDS_PER_SECOND,
  );
};

export const isSessionExpiredAt = (
  expiresAt: number | undefined,
  nowSeconds: number = Math.floor(Date.now() / MILLISECONDS_PER_SECOND),
): boolean => {
  return typeof expiresAt === "number" && expiresAt <= nowSeconds;
};

export const resolveSessionExpiresAt = ({
  issuedAt,
  existingExpiresAt,
  maxAgeSeconds,
  nowMs = Date.now(),
}: ResolveSessionExpiresAtParams): number => {
  const baseEpochSeconds =
    typeof issuedAt === "number"
      ? issuedAt
      : Math.floor(nowMs / MILLISECONDS_PER_SECOND);
  const midnightExpiresAt =
    typeof issuedAt === "number"
      ? getNextKoreanMidnightFromEpochSeconds(issuedAt)
      : getNextKoreanMidnightEpochSeconds(nowMs);
  const maxAgeExpiresAt =
    typeof maxAgeSeconds === "number"
      ? baseEpochSeconds + maxAgeSeconds
      : midnightExpiresAt;
  const resolvedExpiresAt = Math.min(midnightExpiresAt, maxAgeExpiresAt);

  if (
    typeof existingExpiresAt === "number" &&
    existingExpiresAt <= resolvedExpiresAt
  ) {
    return existingExpiresAt;
  }

  return resolvedExpiresAt;
};
