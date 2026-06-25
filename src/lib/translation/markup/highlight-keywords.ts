import { normalizeTermKey } from "@/lib/translation/markup/summary-terms-normalizer";
import {
  normalizeInlineMarkupSource,
  stripResidualMarkupTags,
} from "@/lib/translation/markup/inline-markup-utils";
import type { KeywordTerm } from "@/types/translation";

export type TextSegmentType =
  | "text"
  | "keyword"
  | "emphasis"
  | "section-label"
  | "bold"
  | "link";

export interface TextSegment {
  type: TextSegmentType;
  value: string;
  /** type이 "link"일 때만 사용 — 마크다운 링크의 이동 경로 */
  href?: string;
}

interface HighlightRule {
  matchTerm: string;
  type: "keyword" | "emphasis";
}

const containsHangul = (value: string): boolean => {
  return /[\u3131-\uD7A3]/.test(value);
};

const resolveMatchTerm = (
  term: string,
  type: "keyword" | "emphasis",
): { matchTerm: string; type: "keyword" | "emphasis" } => {
  const trimmedTerm = term.trim();

  if (containsHangul(trimmedTerm)) {
    return { matchTerm: trimmedTerm, type: "emphasis" };
  }

  if (/\s/.test(trimmedTerm)) {
    return { matchTerm: trimmedTerm, type: "emphasis" };
  }

  return { matchTerm: trimmedTerm, type };
};

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const buildHighlightRules = (summaryTerms: KeywordTerm[]): HighlightRule[] => {
  const uniqueRules = new Map<string, HighlightRule>();

  summaryTerms.forEach((item) => {
    const term = item.term.trim();
    const termKey = normalizeTermKey(term);
    if (!termKey) return;

    const resolvedRule = resolveMatchTerm(
      term,
      item.isCoreKeyword ? "keyword" : "emphasis",
    );
    const nextRule: HighlightRule = {
      matchTerm: resolvedRule.matchTerm,
      type: resolvedRule.type,
    };
    const ruleKey = normalizeTermKey(nextRule.matchTerm);

    const existingRule = uniqueRules.get(ruleKey);
    if (!existingRule) {
      uniqueRules.set(ruleKey, nextRule);
      return;
    }

    if (nextRule.type === "keyword" && existingRule.type !== "keyword") {
      uniqueRules.set(ruleKey, nextRule);
    }
  });

  return [...uniqueRules.values()].sort(
    (left, right) => right.matchTerm.length - left.matchTerm.length,
  );
};

const resolveMatchedRule = (
  matchedValue: string,
  rules: HighlightRule[],
): HighlightRule | null => {
  const loweredMatchedValue = matchedValue.toLowerCase();

  return (
    rules.find(
      (rule) => rule.matchTerm.toLowerCase() === loweredMatchedValue,
    ) ?? null
  );
};

export const splitTextByHighlights = (
  text: string,
  summaryTerms: KeywordTerm[],
): TextSegment[] => {
  const rules = buildHighlightRules(summaryTerms);

  if (rules.length === 0) {
    return [{ type: "text", value: text }];
  }

  const pattern = new RegExp(
    `(${rules.map((rule) => escapeRegExp(rule.matchTerm)).join("|")})`,
    "gi",
  );

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const matchIndex = match.index ?? 0;
    const matchedValue = match[0];
    const matchedRule = resolveMatchedRule(matchedValue, rules);

    if (!matchedRule) {
      continue;
    }

    if (matchIndex > lastIndex) {
      segments.push({
        type: "text",
        value: text.slice(lastIndex, matchIndex),
      });
    }

    segments.push({
      type: matchedRule.type === "keyword" ? "keyword" : "emphasis",
      value: matchedValue,
    });

    lastIndex = matchIndex + matchedValue.length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
};

export const splitTextByCoreKeywords = (
  text: string,
  summaryTerms: KeywordTerm[],
): TextSegment[] => {
  return splitTextByHighlights(text, summaryTerms);
};

const SECTION_LABEL_PATTERN =
  /(^|\n)(-\s*)?((?:[A-Z][A-Za-z0-9'&().\s-]{1,60})|(?:[\u3131-\uD7A3][^\n:]{1,28})):( )/g;

export const splitTextBySectionLabels = (text: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(SECTION_LABEL_PATTERN)) {
    const matchIndex = match.index ?? 0;
    const linePrefix = match[1] ?? "";
    const dashPrefix = match[2] ?? "";
    const label = match[3] ?? "";
    const colonSuffix = match[4] ?? "";

    if (matchIndex > lastIndex) {
      segments.push({
        type: "text",
        value: text.slice(lastIndex, matchIndex),
      });
    }

    if (linePrefix === "\n") {
      segments.push({ type: "text", value: "\n" });
    }

    segments.push({
      type: "section-label",
      value: `${dashPrefix}${label}:`,
    });
    segments.push({ type: "text", value: colonSuffix });
    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
};

export const expandSegmentsWithSectionLabels = (
  segments: TextSegment[],
): TextSegment[] => {
  return segments.flatMap((segment) => {
    if (segment.type !== "text") {
      return [segment];
    }

    return splitTextBySectionLabels(segment.value);
  });
};

const UNDERLINE_AND_CODE_PATTERN =
  /<u>([\s\S]*?)<\/u>|`([^`\n]+)`/gi;

const BOLD_PATTERN = /\*\*([^*\n]+)\*\*/g;

const stripResidualTermMarkupTags = (value: string): string => {
  return value
    .replace(/<\/?u>/gi, "")
    .replace(/\/u>/gi, "")
    .replace(/<\/?u(?![\w>])/gi, "")
    .replace(/`/g, "");
};

const pushResidualTextSegment = (
  segments: TextSegment[],
  value: string,
  options: { preserveBold?: boolean; skipStrip?: boolean } = {},
): void => {
  // skipStrip: 이후 단계(링크 → 굵게 → 밑줄/코드)가 아직 이 텍스트를 보지 못했다면
  // 여기서 먼저 태그를 지우면 안 된다 — 그러면 다음 단계가 패턴을 찾지 못해
  // <u>, [text](url) 같은 마크업이 그대로 글자로 남는다. 정리는 마지막 단계에서만 한다.
  const cleanedValue = options.skipStrip
    ? value
    : options.preserveBold
      ? stripResidualTermMarkupTags(value)
      : stripResidualMarkupTags(value);

  if (!cleanedValue) {
    return;
  }

  segments.push({
    type: "text",
    value: cleanedValue,
  });
};

const splitTextByUnderlineAndCode = (text: string): TextSegment[] => {
  const normalizedText = normalizeInlineMarkupSource(text);
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of normalizedText.matchAll(UNDERLINE_AND_CODE_PATTERN)) {
    const matchIndex = match.index ?? 0;
    const underlineValue = match[1];
    const backtickValue = match[2];

    if (matchIndex > lastIndex) {
      pushResidualTextSegment(
        segments,
        normalizedText.slice(lastIndex, matchIndex),
        { preserveBold: true },
      );
    }

    if (underlineValue !== undefined) {
      segments.push({
        type: "emphasis",
        value: underlineValue.trim(),
      });
    } else if (backtickValue !== undefined) {
      segments.push({
        type: "keyword",
        value: backtickValue.trim(),
      });
    }

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < normalizedText.length) {
    pushResidualTextSegment(segments, normalizedText.slice(lastIndex), {
      preserveBold: true,
    });
  }

  return segments.length > 0
    ? segments
    : [{ type: "text", value: stripResidualTermMarkupTags(normalizedText) }];
};

const splitTextByBold = (text: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(BOLD_PATTERN)) {
    const matchIndex = match.index ?? 0;
    const boldValue = match[1];

    if (matchIndex > lastIndex) {
      pushResidualTextSegment(segments, text.slice(lastIndex, matchIndex), {
        skipStrip: true,
      });
    }

    if (boldValue !== undefined) {
      segments.push({
        type: "bold",
        value: boldValue.trim(),
      });
    }

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    pushResidualTextSegment(segments, text.slice(lastIndex), {
      skipStrip: true,
    });
  }

  return segments.length > 0
    ? segments
    : [{ type: "text", value: text }];
};

/** [라벨](경로) 형식의 마크다운 링크 — 절대/상대 경로 모두 인식 */
const MARKDOWN_LINK_PATTERN = /\[([^\]\n]+)\]\(([^\s()]+)\)/g;

const splitTextByMarkdownLinks = (text: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MARKDOWN_LINK_PATTERN)) {
    const matchIndex = match.index ?? 0;
    const label = match[1];
    const href = match[2];

    if (matchIndex > lastIndex) {
      pushResidualTextSegment(segments, text.slice(lastIndex, matchIndex), {
        skipStrip: true,
      });
    }

    if (label && href) {
      segments.push({ type: "link", value: label.trim(), href: href.trim() });
    }

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    pushResidualTextSegment(segments, text.slice(lastIndex), {
      skipStrip: true,
    });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
};

export const splitTextByInlineMarkup = (text: string): TextSegment[] => {
  const normalizedText = normalizeInlineMarkupSource(text);

  return splitTextByMarkdownLinks(normalizedText).flatMap((linkSegment) => {
    if (linkSegment.type !== "text") {
      return [linkSegment];
    }

    return splitTextByBold(linkSegment.value).flatMap((boldSegment) => {
      if (boldSegment.type !== "text") {
        return [boldSegment];
      }

      return splitTextByUnderlineAndCode(boldSegment.value);
    });
  });
};

export const applyInlineMarkupToSegments = (
  segments: TextSegment[],
): TextSegment[] => {
  return segments.flatMap((segment) => {
    if (segment.type !== "text") {
      return [segment];
    }

    return splitTextByInlineMarkup(segment.value);
  });
};

export const splitContentByParagraphs = (content: string): string[] => {
  const normalizedContent = content.replace(/\r\n/g, "\n").trim();

  if (!normalizedContent) {
    return [];
  }

  const paragraphs = normalizedContent
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  return paragraphs.length > 0 ? paragraphs : [normalizedContent];
};
