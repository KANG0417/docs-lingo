export const decodeBasicHtmlEntities = (value: string): string => {
  return value
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
};

const decodeHtmlEntitiesFully = (value: string): string => {
  let current = value;
  let previous = "";
  let iterations = 0;

  while (current !== previous && iterations < 4) {
    previous = current;
    current = decodeBasicHtmlEntities(current);
    iterations += 1;
  }

  return current;
};

/** AI가 `<u>term</u` · `<u>term/u>` · `` `<u>term</u>` `` 등으로 출력한 경우 복구 */
export const repairMalformedUnderlineTags = (value: string): string => {
  return value
    .replace(/`\s*(<u>[\s\S]*?<\/u>)\s*`/gi, "$1")
    .replace(/<u>([\s\S]*?)(?<![<])\/u>/gi, "<u>$1</u>")
    .replace(/<u>([\s\S]*?)<\/u(?!>)/gi, "<u>$1</u>");
};

export const stripInlineMarkupDelimiters = (value: string): string => {
  return decodeHtmlEntitiesFully(value)
    .replace(/<\/?u>/gi, "")
    .replace(/^`([\s\S]+)`$/, "$1")
    .replace(/^\*\*([\s\S]+)\*\*$/, "$1")
    .trim();
};

export const normalizeInlineMarkupSource = (value: string): string => {
  const decoded = decodeHtmlEntitiesFully(value);
  const repaired = repairMalformedUnderlineTags(decoded);

  return repaired
    .replace(/<\s*u\s*>/gi, "<u>")
    .replace(/<\/\s*u\s*>/gi, "</u>")
    .replace(/<\/u\s+>/gi, "</u>");
};

/** 섹션 제목 판별 전 — 밑줄·백틱·볼드 인라인 마크업이 있으면 본문 용어 표기로 취급 */
export const containsInlineTermMarkup = (value: string): boolean => {
  const source = normalizeInlineMarkupSource(value.trim());

  return /(<u>[\s\S]*?<\/u>|`[^`\n]+`|\*\*[^*\n]+\*\*)/i.test(source);
};

export const normalizeKeywordDescription = (
  description: string,
  term?: string,
): string => {
  let source = normalizeInlineMarkupSource(description);

  source = source
    .replace(/<u>([\s\S]*?)<\/u>/gi, "$1")
    .replace(/`([^`\n]+)`/g, "$1");

  if (term) {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    source = source.replace(
      new RegExp(`\\*\\*\\s*${escapedTerm}\\s*\\*\\*`, "gi"),
      term,
    );
  }

  return source;
};

export const stripSectionHeadingMarkup = (value: string): string => {
  return decodeHtmlEntitiesFully(value)
    .replace(/<\/?u>/gi, "")
    .replace(/`/g, "")
    .replace(/\*\*/g, "")
    .trim();
};

export const stripSectionNavPrefix = (value: string): string => {
  return stripSectionHeadingMarkup(value)
    .replace(
      /^(?:시작하기|Getting Started|빠른 시작|Quick Start|Introduction|소개)\s*[:：]\s*/iu,
      "",
    )
    .trim();
};

export const resolveSectionHeadingText = (line: string): string => {
  const trimmed = stripSectionHeadingMarkup(line.trim());
  const withoutNavPrefix = stripSectionNavPrefix(trimmed);

  if (withoutNavPrefix) {
    return withoutNavPrefix;
  }

  return trimmed;
};

export const stripResidualMarkupTags = (value: string): string => {
  return value
    .replace(/<\/?u>/gi, "")
    .replace(/\/u>/gi, "")
    .replace(/<\/?u(?![\w>])/gi, "")
    .replace(/`/g, "")
    .replace(/\*\*/g, "");
};
