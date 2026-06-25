import { isDashSectionLabelLine } from "@/lib/translation/markup/translation-section-label-utils";

/**
 * 번역 결과 목록 줄 판별.
 * `- 항목`처럼 대시 뒤 공백이 있을 때만 목록으로 본다.
 * `-API 레퍼런스:` 형태는 섹션 라벨로 처리한다.
 */
export const TRANSLATION_LIST_ITEM_PATTERN =
  /^\s*(?:•\s+|(?:-\s+)|(?:\*(?!\*)\s+))(.+)$/u;

export const parseTranslationListItemLine = (line: string): string | null => {
  if (isDashSectionLabelLine(line)) {
    return null;
  }

  const match = TRANSLATION_LIST_ITEM_PATTERN.exec(line);
  const item = match?.[1]?.trim();

  return item ? item : null;
};

export const isTranslationListItemLine = (line: string): boolean => {
  return parseTranslationListItemLine(line) !== null;
};

/** AI가 쓰는 `* ` 마크다운 불릿을 `- `로 통일 (렌더러는 `-`만 목록으로 처리) */
export const normalizeTranslationListMarkers = (content: string): string => {
  return content
    .split("\n")
    .map((line) => line.replace(/^(\s*)\*(?!\*)\s+/, "$1- "))
    .join("\n");
};

/** 볼드 마크업 제거 후 남는 줄 시작 `* ` 잔여 기호 제거 */
export const stripOrphanLineStartAsterisks = (content: string): string => {
  return content
    .split("\n")
    .map((line) => line.replace(/^(\s*)\*(?!\*)\s+/, "$1"))
    .join("\n");
};
