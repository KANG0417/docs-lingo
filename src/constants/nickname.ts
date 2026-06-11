export const NICKNAME_MIN_LENGTH = 2;

export const NICKNAME_MAX_LENGTH = 12;

export const NICKNAME_PATTERN = /^[a-zA-Z0-9가-힣_.-]+$/;

export const RESERVED_NICKNAMES: readonly string[] = [
  "admin",
  "administrator",
  "운영자",
  "관리자",
  "독스링고",
  "docs-ligo",
  "docslingo",
  "system",
  "null",
  "undefined",
];

/** 강한 비속어·욕설만 포함 (바보, 멍청이 등 가벼운 표현 제외) */
export const PROFANITY_NICKNAME_WORDS: readonly string[] = [
  "씨발",
  "씨팔",
  "씨발년",
  "씨팔년",
  "시발",
  "시팔",
  "시발년",
  "씹",
  "좆",
  "좆같",
  "개새끼",
  "개쉐",
  "개색",
  "지랄",
  "병신",
  "븅신",
  "썅",
  "쌍",
  "fuck",
  "fuk",
  "shit",
  "bitch",
  "asshole",
];

/** 자모·초성 등 우회 표기 */
export const PROFANITY_NICKNAME_PATTERNS: readonly RegExp[] = [
  /ㅅㅂ/,
  /ㅆㅂ/,
  /ㅂㅅ/,
  /시\s*발/,
  /씨\s*발/,
];

export const NICKNAME_RULE_LINES: readonly string[] = [
  "앞뒤 공백은 제거되며, 닉네임 안에는 공백을 넣을 수 없습니다.",
  "한글, 영문, 숫자와 특수문자(_, -, .)만 사용할 수 있습니다.",
  "2~12자까지 입력할 수 있습니다.",
  "admin, 관리자, 독스링고 등 예약어는 사용할 수 없습니다.",
  "욕설·비속어가 포함된 닉네임은 사용할 수 없습니다.",
];
