const SECTION_LABELS = [
  "Getting Started",
  "Quick Start",
  "Introduction",
  "Overview",
  "Tutorial",
  "Guide",
  "Chapter",
  "Section",
  "Example",
  "Note",
  "Warning",
  "Summary",
  "Prerequisites",
  "시작하기",
  "빠른 시작",
  "소개",
  "개요",
  "튜토리얼",
  "가이드",
  "목차",
  "요약",
  "참고",
  "주의",
  "예시",
  "단계",
  "설명",
  "개념",
  "정의",
  "특징",
  "사용법",
  "준비",
  "다음",
] as const;

const KOREAN_SENTENCE_ENDINGS = ["입니다", "습니다"] as const;

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const buildLabelGroup = (): string => {
  return SECTION_LABELS.map(escapeRegExp).join("|");
};

const insertBreakBeforeSectionLabels = (content: string): string => {
  const labelGroup = buildLabelGroup();
  const endingGroup = KOREAN_SENTENCE_ENDINGS.map(escapeRegExp).join("|");

  const endingWithPeriodPattern = new RegExp(
    `(${endingGroup})\\.\\s*(${labelGroup})\\s*[:：]`,
    "gi",
  );

  const endingWithoutPeriodPattern = new RegExp(
    `(${endingGroup})\\s*(${labelGroup})\\s*[:：]`,
    "gi",
  );

  let normalizedContent = content.replace(
    endingWithPeriodPattern,
    "$1.\n$2:",
  );

  normalizedContent = normalizedContent.replace(
    endingWithoutPeriodPattern,
    "$1\n$2:",
  );

  return normalizedContent;
};

const insertBreakAfterKoreanIntroSentences = (content: string): string => {
  const endingGroup = KOREAN_SENTENCE_ENDINGS.map(escapeRegExp).join("|");

  return content.replace(
    new RegExp(`(${endingGroup})\\.(?!\\n)`, "g"),
    "$1.\n",
  );
};

export const normalizeTranslatedLayout = (content: string): string => {
  let normalizedContent = content.replace(/\r\n/g, "\n").trim();

  normalizedContent = insertBreakBeforeSectionLabels(normalizedContent);
  normalizedContent = insertBreakAfterKoreanIntroSentences(normalizedContent);

  return normalizedContent
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
};
