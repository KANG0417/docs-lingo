import { normalizeSummaryTerms } from "@/lib/translation/markup/summary-terms-normalizer";
import type { KeywordTerm } from "@/types/translation";

const normalizeTerm = (term: string): string => {
  return term.replace(/^[`"'[\(]+|[`"'\]\)]+$/g, "").trim();
};

const isValidTerm = (term: string): boolean => {
  if (term.length < 2 || term.length > 48) return false;
  if (/^\d+$/.test(term)) return false;
  return /[A-Za-z가-힣]/.test(term);
};

const buildConceptDescription = (): string => {
  return `프론트엔드 실무에서 자주 쓰이는 기술 개념으로, **아키텍처·구현·설정 판단의 기준**이 됩니다.`;
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
      description: buildConceptDescription(),
      isCoreKeyword: false,
    });
  });

  return normalizeSummaryTerms([...uniqueTerms.values()]);
};
