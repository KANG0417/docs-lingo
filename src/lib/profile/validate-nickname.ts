import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  NICKNAME_PATTERN,
  PROFANITY_NICKNAME_PATTERNS,
  PROFANITY_NICKNAME_WORDS,
  RESERVED_NICKNAMES,
} from "@/constants/nickname";

const normalizeNicknameForCompare = (value: string): string =>
  value.trim().toLowerCase().replace(/[_\-.]/g, "");

const getGraphemeSegmenter = (): Intl.Segmenter | null => {
  try {
    return new Intl.Segmenter("ko", { granularity: "grapheme" });
  } catch {
    return null;
  }
};

const splitNicknameGraphemes = (value: string): string[] => {
  const segmenter = getGraphemeSegmenter();

  if (!segmenter) {
    return Array.from(value);
  }

  return Array.from(segmenter.segment(value), (segment) => segment.segment);
};

export const getNicknameLength = (value: string): number =>
  splitNicknameGraphemes(value).length;

export const enforceNicknameMaxLength = (value: string): string =>
  splitNicknameGraphemes(value).slice(0, NICKNAME_MAX_LENGTH).join("");

export const validateNickname = (raw: string): string | null => {
  const nickname = raw.trim();

  if (!nickname) {
    return "닉네임을 입력해주세요.";
  }

  if (raw !== nickname || /\s/.test(nickname)) {
    return "닉네임에 공백을 사용할 수 없습니다.";
  }

  const nicknameLength = getNicknameLength(nickname);

  if (nicknameLength < NICKNAME_MIN_LENGTH) {
    return `닉네임은 ${NICKNAME_MIN_LENGTH}자 이상 입력해주세요.`;
  }

  if (nicknameLength > NICKNAME_MAX_LENGTH) {
    return `닉네임은 ${NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`;
  }

  const lowerNickname = nickname.toLowerCase();

  const hasProfanityWord = PROFANITY_NICKNAME_WORDS.some(
    (word) => nickname.includes(word) || lowerNickname.includes(word.toLowerCase()),
  );

  const hasProfanityPattern = PROFANITY_NICKNAME_PATTERNS.some((pattern) =>
    pattern.test(nickname),
  );

  if (hasProfanityWord || hasProfanityPattern) {
    return "욕설·비속어가 포함된 닉네임은 사용할 수 없습니다.";
  }

  if (!NICKNAME_PATTERN.test(nickname)) {
    return "닉네임은 한글, 영문, 숫자와 _, -, . 만 사용할 수 있습니다.";
  }

  const normalizedNickname = normalizeNicknameForCompare(nickname);

  const isReserved = RESERVED_NICKNAMES.some(
    (reserved) => normalizeNicknameForCompare(reserved) === normalizedNickname,
  );

  if (isReserved) {
    return "사용할 수 없는 예약어입니다.";
  }

  return null;
};

export const resolveNicknameForProfile = (
  nickname: string | null | undefined,
): string => {
  const candidate = nickname?.trim() || "사용자";

  if (validateNickname(candidate)) {
    return "사용자";
  }

  return candidate;
};
