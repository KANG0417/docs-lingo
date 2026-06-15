import { normalizeTermKey } from "@/lib/translation/summary-terms-normalizer";
import {
  normalizeInlineMarkupSource,
  stripResidualMarkupTags,
} from "@/lib/translation/inline-markup-utils";
import type { KeywordTerm } from "@/types/translation";

export type TextSegmentType =
  | "text"
  | "keyword"
  | "emphasis"
  | "section-label"
  | "bold";

export interface TextSegment {
  type: TextSegmentType;
  value: string;
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
  /(^|\n)((?:[A-Z][A-Za-z0-9'&().\s-]{1,60})|(?:[\u3131-\uD7A3][^\n:]{1,28})):( )/g;

export const splitTextBySectionLabels = (text: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(SECTION_LABEL_PATTERN)) {
    const matchIndex = match.index ?? 0;
    const linePrefix = match[1] ?? "";
    const label = match[2] ?? "";
    const colonSuffix = match[3] ?? "";

    if (matchIndex > lastIndex) {
      segments.push({
        type: "text",
        value: text.slice(lastIndex, matchIndex),
      });
    }

    if (linePrefix === "\n") {
      segments.push({ type: "text", value: "\n" });
    }

    segments.push({ type: "section-label", value: label });
    segments.push({ type: "text", value: `:${colonSuffix}` });
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

const INLINE_MARKUP_PATTERN =
  /<u>([\s\S]*?)<\/u>|`([^`\n]+)`|\*\*([^*\n]+)\*\*/gi;

export const splitTextByInlineMarkup = (text: string): TextSegment[] => {
  const normalizedText = normalizeInlineMarkupSource(text);
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of normalizedText.matchAll(INLINE_MARKUP_PATTERN)) {
    const matchIndex = match.index ?? 0;
    const underlineValue = match[1];
    const backtickValue = match[2];
    const boldValue = match[3];

    if (matchIndex > lastIndex) {
      segments.push({
        type: "text",
        value: stripResidualMarkupTags(
          normalizedText.slice(lastIndex, matchIndex),
        ),
      });
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
    } else if (boldValue !== undefined) {
      segments.push({
        type: "bold",
        value: boldValue.trim(),
      });
    }

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < normalizedText.length) {
    segments.push({
      type: "text",
      value: stripResidualMarkupTags(normalizedText.slice(lastIndex)),
    });
  }

  return segments.length > 0
    ? segments
    : [{ type: "text", value: stripResidualMarkupTags(normalizedText) }];
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
