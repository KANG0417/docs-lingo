import {
  stripOrphanLineStartAsterisks,
} from "@/lib/translation/markup/translation-list-line-utils";

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

/** AI가 **를 열고 닫지 않은 경우 — 문장 끝까지 핵심 구절로 굵게 복구 */
export const repairMalformedBoldMarkers = (value: string): string => {
  let result = value.replace(/\*{3,}/g, "**").replace(/\*\*\s*\*\*/g, "");

  const markerCount = (result.match(/\*\*/g) ?? []).length;
  if (markerCount % 2 !== 0) {
    result = `${result}**`;
  }

  return result;
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
  const repairedUnderline = repairMalformedUnderlineTags(decoded);
  const repairedBold = repairMalformedBoldMarkers(repairedUnderline);

  return repairedBold
    .replace(/<\s*u\s*>/gi, "<u>")
    .replace(/<\/\s*u\s*>/gi, "</u>")
    .replace(/<\/u\s+>/gi, "</u>");
};

/** 섹션 제목 판별 전 — 밑줄·백틱·볼드 인라인 마크업이 있으면 본문 용어 표기로 취급 */
export const containsInlineTermMarkup = (value: string): boolean => {
  const source = normalizeInlineMarkupSource(value.trim());

  return /(<u>[\s\S]*?<\/u>|`[^`\n]+`|\*\*[^*\n]+\*\*)/i.test(source);
};

export const stripDocumentReferenceFromDescription = (value: string): string => {
  return value
    .replace(
      /^(?:이|본|해당|위)\s*문서(?:에|에서|를|에는|에\s*따르면|에서\s*설명한)?\s*/iu,
      "",
    )
    .replace(
      /^(?:위|아래)\s*(?:내용|설명|번역(?:문|된\s*내용)?)(?:에|에서|을|에는|에\s*따르면)?\s*/iu,
      "",
    )
    .replace(/^(?:원문|번역문)(?:에|에서|을|에는)?\s*/iu, "")
    .replace(/^(?:문서|가이드|문서에서)\s*(?:에\s*나온|에\s*소개된)?\s*/iu, "")
    .trim();
};

export const normalizeKeywordDescription = (
  description: string,
  term?: string,
): string => {
  let source = stripDocumentReferenceFromDescription(
    normalizeInlineMarkupSource(description),
  );

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

/**
 * 완전 번역에는 <u> 강조를 전혀 쓰지 않기로 했지만, 모델이 지시를 어기고
 * <u>를 추가하는 경우가 있어 결정적으로 제거한다. 백틱·**는 그대로 둔다.
 */
export const stripUnderlineEmphasis = (value: string): string => {
  return normalizeInlineMarkupSource(value)
    .replace(/<\/?u>/gi, "")
    .replace(/\/u>/gi, "")
    .replace(/<\/?u(?![\w>])/gi, "");
};

export const stripResidualMarkupTags = (value: string): string => {
  return stripOrphanLineStartAsterisks(
    value
      .replace(/<\/?u>/gi, "")
      .replace(/\/u>/gi, "")
      .replace(/<\/?u(?![\w>])/gi, "")
      .replace(/`/g, "")
      .replace(/\*\*/g, ""),
  );
};
