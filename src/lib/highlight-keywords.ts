import type { KeywordTerm } from "@/types/translation";

export interface TextSegment {
  type: "text" | "keyword";
  value: string;
}

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const splitTextByCoreKeywords = (
  text: string,
  summaryTerms: KeywordTerm[],
): TextSegment[] => {
  const coreTerms = summaryTerms
    .filter((item) => item.isCoreKeyword)
    .map((item) => item.term.trim())
    .filter((term) => term.length > 0)
    .sort((left, right) => right.length - left.length);

  if (coreTerms.length === 0) {
    return [{ type: "text", value: text }];
  }

  const pattern = new RegExp(
    `(${coreTerms.map(escapeRegExp).join("|")})`,
    "gi",
  );

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      segments.push({
        type: "text",
        value: text.slice(lastIndex, matchIndex),
      });
    }

    segments.push({
      type: "keyword",
      value: match[0],
    });

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
