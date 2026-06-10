import type { KeywordTerm } from "@/types/translation";

const MAX_SUMMARY_TERMS = 8;
const MAX_CORE_KEYWORDS = 4;

const normalizeTerm = (term: string): string => {
  return term.replace(/^[`"'[\(]+|[`"'\]\)]+$/g, "").trim();
};

const isValidTerm = (term: string): boolean => {
  if (term.length < 2 || term.length > 48) return false;
  if (/^\d+$/.test(term)) return false;
  return /[A-Za-z가-힣]/.test(term);
};

const buildDescription = (
  term: string,
  sourceText: string,
  translatedText: string,
): string => {
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const englishMatch = sourceText
    .match(
      new RegExp(
        `[^.!?\\n]{0,120}\\b${escapedTerm}\\b[^.!?\\n]{0,120}[.!?]?`,
        "i",
      ),
    )
    ?.[0]
    ?.trim();

  if (englishMatch && englishMatch.length > term.length + 8) {
    return englishMatch;
  }

  const koreanMatch = translatedText
    .match(new RegExp(`[^.!?\\n]{0,80}${escapedTerm}[^.!?\\n]{0,80}`, "i"))
    ?.[0]
    ?.trim();

  if (koreanMatch && koreanMatch.length > term.length + 4) {
    return koreanMatch;
  }

  return `${term}에 대한 핵심 개념입니다.`;
};

export const extractKeywordTermsFallback = (
  originalContent: string,
  translatedContent: string,
  title: string,
): KeywordTerm[] => {
  const combinedText = `${title}\n${originalContent}\n${translatedContent}`;
  const patternMatches = [
    ...combinedText.matchAll(/`([^`\n]{2,40})`/g),
    ...combinedText.matchAll(/\b([A-Za-z]+(?:[A-Z][a-z0-9]+)+)\b/g),
    ...combinedText.matchAll(/\b([A-Z]{2,}(?:_[A-Z0-9]+)*)\b/g),
  ];

  const uniqueTerms = new Map<string, KeywordTerm>();

  patternMatches.forEach((match) => {
    const term = normalizeTerm(match[1]);
    if (!isValidTerm(term)) return;

    const normalizedKey = term.toLowerCase();
    if (uniqueTerms.has(normalizedKey)) return;

    uniqueTerms.set(normalizedKey, {
      term,
      description: buildDescription(term, originalContent, translatedContent),
      isCoreKeyword: false,
    });
  });

  const sortedTerms = [...uniqueTerms.values()].slice(0, MAX_SUMMARY_TERMS);

  return sortedTerms.map((item, index) => ({
    ...item,
    isCoreKeyword: index < MAX_CORE_KEYWORDS,
  }));
};
