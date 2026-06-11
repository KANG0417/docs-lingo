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

export interface NicknameRuleSegment {
  text: string;
  emphasize?: boolean;
}

export const NICKNAME_RULE_LINES: readonly NicknameRuleSegment[][] = [
  [
    { text: "앞뒤 " },
    { text: "공백", emphasize: true },
    { text: "은 제거되며, 닉네임 안에는 " },
    { text: "공백", emphasize: true },
    { text: "을 넣을 수 없습니다." },
  ],
  [
    { text: "" },
    { text: "한글, 영문, 숫자", emphasize: true },
    { text: "와 특수문자(" },
    { text: "_, -, .", emphasize: true },
    { text: ")만 사용할 수 있습니다." },
  ],
  [
    { text: "" },
    { text: "2~12자", emphasize: true },
    { text: "까지 입력할 수 있습니다." },
  ],
  [
    { text: "" },
    { text: "admin, 관리자, 독스링고", emphasize: true },
    { text: " 등 " },
    { text: "예약어", emphasize: true },
    { text: "는 사용할 수 없습니다." },
  ],
  [
    { text: "" },
    { text: "3일에 한 번", emphasize: true },
    { text: "만 변경할 수 있습니다." },
  ],
  [
    { text: "" },
    { text: "욕설·비속어", emphasize: true },
    { text: "가 포함된 닉네임은 사용할 수 없습니다." },
  ],
];
