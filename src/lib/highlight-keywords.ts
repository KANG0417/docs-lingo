import { normalizeTermKey } from "@/lib/summary-terms-normalizer";
import type { KeywordTerm } from "@/types/translation";

export type TextSegmentType = "text" | "keyword" | "emphasis";

export interface TextSegment {
  type: TextSegmentType;
  value: string;
}

interface HighlightRule {
  term: string;
  type: "keyword" | "emphasis";
}

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const buildHighlightRules = (summaryTerms: KeywordTerm[]): HighlightRule[] => {
  const uniqueRules = new Map<string, HighlightRule>();

  summaryTerms.forEach((item) => {
    const term = item.term.trim();
    const termKey = normalizeTermKey(term);
    if (!termKey) return;

    const nextRule: HighlightRule = {
      term,
      type: item.isCoreKeyword ? "keyword" : "emphasis",
    };

    const existingRule = uniqueRules.get(termKey);
    if (!existingRule) {
      uniqueRules.set(termKey, nextRule);
      return;
    }

    if (nextRule.type === "keyword" && existingRule.type !== "keyword") {
      uniqueRules.set(termKey, nextRule);
    }
  });

  return [...uniqueRules.values()].sort(
    (left, right) => right.term.length - left.term.length,
  );
};

const resolveMatchedRule = (
  matchedValue: string,
  rules: HighlightRule[],
): HighlightRule | null => {
  const loweredMatchedValue = matchedValue.toLowerCase();

  return (
    rules.find((rule) => rule.term.toLowerCase() === loweredMatchedValue) ??
    null
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
    `(${rules.map((rule) => escapeRegExp(rule.term)).join("|")})`,
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
