import type { KeywordTerm } from "@/types/translation";

const MAX_SUMMARY_TERMS = 8;
const MAX_CORE_KEYWORDS = 4;

const GENERIC_DOC_TERM_PATTERNS = [
  /^api\s*references?$/i,
  /^references?$/i,
  /^documentation$/i,
  /^docs?$/i,
  /^official\s+(docs?|documentation|site)$/i,
  /^user\s+guide$/i,
  /^developer\s+guide$/i,
  /^getting\s+started$/i,
  /^quick\s+start$/i,
  /^table\s+of\s+contents?$/i,
  /^changelog$/i,
  /^release\s+notes?$/i,
  /^readme$/i,
  /^overview$/i,
  /^introduction$/i,
  /^learn\s+more$/i,
  /^see\s+also$/i,
  /^related\s+(links?|topics?)$/i,
  /^navigation$/i,
  /^sidebar$/i,
  /^footer$/i,
  /^header$/i,
  /^menu$/i,
  /^index$/i,
  /^home$/i,
  /^search$/i,
  /^contents?$/i,
];

const GENERIC_DOC_TERM_KEYWORDS = [
  "reference",
  "references",
  "documentation",
  "tutorial",
  "overview",
  "introduction",
  "changelog",
  "readme",
  "navigation",
];

export const normalizeTermKey = (term: string): string => {
  return term
    .replace(/^[`"'[\(]+|[`"'\]\)]+$/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const stripDuplicateTermFromDescription = (
  term: string,
  description: string,
): string => {
  const trimmedDescription = description.trim();
  const trimmedTerm = term.trim();

  if (!trimmedTerm || !trimmedDescription) {
    return trimmedDescription;
  }

  const duplicatePrefixPattern = new RegExp(
    `^${escapeRegExp(trimmedTerm)}\\s*[:：]\\s*`,
    "i",
  );

  let normalizedDescription = trimmedDescription;
  let previousDescription = "";

  while (normalizedDescription !== previousDescription) {
    previousDescription = normalizedDescription;
    normalizedDescription = normalizedDescription
      .replace(duplicatePrefixPattern, "")
      .trim();
  }

  return normalizedDescription;
};

const isGenericDocTerm = (term: string): boolean => {
  const normalizedTerm = normalizeTermKey(term);

  if (!normalizedTerm) {
    return true;
  }

  if (GENERIC_DOC_TERM_PATTERNS.some((pattern) => pattern.test(normalizedTerm))) {
    return true;
  }

  return GENERIC_DOC_TERM_KEYWORDS.some((keyword) => {
    if (normalizedTerm === keyword) {
      return true;
    }

    return (
      normalizedTerm.startsWith(`${keyword} `) ||
      normalizedTerm.endsWith(` ${keyword}`) ||
      normalizedTerm.includes(` ${keyword} `)
    );
  });
};

const mergeKeywordTerms = (
  existing: KeywordTerm,
  incoming: KeywordTerm,
): KeywordTerm => {
  return {
    term: existing.term.length >= incoming.term.length ? existing.term : incoming.term,
    description:
      existing.description.length >= incoming.description.length
        ? existing.description
        : incoming.description,
    isCoreKeyword: existing.isCoreKeyword || incoming.isCoreKeyword,
  };
};

const deduplicateByTerm = (terms: KeywordTerm[]): KeywordTerm[] => {
  const uniqueTerms = new Map<string, KeywordTerm>();

  terms.forEach((item) => {
    const termKey = normalizeTermKey(item.term);
    if (!termKey) return;

    const existingTerm = uniqueTerms.get(termKey);
    if (!existingTerm) {
      uniqueTerms.set(termKey, item);
      return;
    }

    uniqueTerms.set(termKey, mergeKeywordTerms(existingTerm, item));
  });

  return [...uniqueTerms.values()];
};

const removeLongerGenericVariants = (terms: KeywordTerm[]): KeywordTerm[] => {
  return terms.filter((item) => {
    if (!isGenericDocTerm(item.term)) {
      return true;
    }

    return false;
  });
};

const removeSubstringDuplicates = (terms: KeywordTerm[]): KeywordTerm[] => {
  return terms.filter((item) => {
    const itemKey = normalizeTermKey(item.term);

    return !terms.some((other) => {
      if (other.term === item.term) {
        return false;
      }

      const otherKey = normalizeTermKey(other.term);

      if (itemKey === otherKey) {
        return false;
      }

      if (otherKey.includes(itemKey) && other.term.length > item.term.length) {
        return isGenericDocTerm(other.term);
      }

      if (itemKey.includes(otherKey) && item.term.length > other.term.length) {
        return isGenericDocTerm(item.term);
      }

      return false;
    });
  });
};

const assignCoreKeywordFlags = (terms: KeywordTerm[]): KeywordTerm[] => {
  const coreTermKeys = new Set(
    terms
      .filter((item) => !isGenericDocTerm(item.term))
      .slice(0, MAX_CORE_KEYWORDS)
      .map((item) => normalizeTermKey(item.term)),
  );

  return terms.map((item) => ({
    ...item,
    isCoreKeyword: coreTermKeys.has(normalizeTermKey(item.term)),
  }));
};

export const normalizeSummaryTerms = (
  summaryTerms: Array<{
    term: string;
    description: string;
    isCoreKeyword?: boolean;
  }>,
): KeywordTerm[] => {
  const cleanedTerms = summaryTerms
    .map((item) => {
      const term = item.term.trim();
      const description = stripDuplicateTermFromDescription(
        term,
        item.description.trim(),
      );

      return {
        term,
        description,
        isCoreKeyword: Boolean(item.isCoreKeyword),
      };
    })
    .filter((item) => item.term && item.description);

  const pipeline = [
    deduplicateByTerm,
    removeLongerGenericVariants,
    removeSubstringDuplicates,
    deduplicateByTerm,
    assignCoreKeywordFlags,
  ];

  const normalizedTerms = pipeline.reduce<KeywordTerm[]>(
    (terms, step) => step(terms),
    cleanedTerms,
  );

  return normalizedTerms.slice(0, MAX_SUMMARY_TERMS);
};
