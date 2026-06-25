import { normalizeSummaryTerms } from "@/lib/translation/markup/summary-terms-normalizer";
import { normalizeDocumentType } from "@/lib/translation/normalize-document-type";
import type {
  ClaudeDocumentTranslationRawResponse,
  ClaudeDocumentTranslationResponse,
} from "@/types/claude-document-translation";
import type { KeywordTerm } from "@/types/translation";

const SUMMARY_SECTION_ORDER = [
  "한 줄 요약",
  "사전 조건",
  "문서 구조",
  "핵심 요약",
  "API·설정 요약",
  "핵심 용어",
  "코드 예제 설명",
  "주의할 점",
  "버전 정보",
] as const;

const normalizeTextItems = (items: string[] | undefined): string[] => {
  return (items ?? []).map((item) => item.trim()).filter(Boolean);
};

const normalizeKeyTerms = (
  keyTerms: ClaudeDocumentTranslationResponse["keyTerms"] = [],
): ClaudeDocumentTranslationResponse["keyTerms"] => {
  return keyTerms
    .map((item) => ({
      term: item.term?.trim() ?? "",
      translation: item.translation?.trim() ?? item.term?.trim() ?? "",
      description: item.description?.trim() ?? "",
    }))
    .filter((item) => item.term && (item.description || item.translation));
};

export const mapKeyTermsToSummaryTerms = (
  keyTerms: ClaudeDocumentTranslationResponse["keyTerms"] = [],
): KeywordTerm[] => {
  return normalizeSummaryTerms(
    normalizeKeyTerms(keyTerms).map((item, index) => ({
      term: item.term,
      description: item.description || item.translation,
      isCoreKeyword: index < 4,
    })),
  );
};

const formatBulletSection = (
  title: string,
  items: string[] | undefined,
): string | null => {
  const filtered = normalizeTextItems(items);

  if (filtered.length === 0) {
    return null;
  }

  return `${title}\n\n${filtered
    .map((item) => `- ${item.replace(/^[-*]\s*/, "")}`)
    .join("\n")}`;
};

const formatParagraphSection = (
  title: string,
  body: string | undefined,
): string | null => {
  const trimmed = body?.trim() ?? "";

  if (!trimmed) {
    return null;
  }

  return `${title}\n\n${trimmed}`;
};

const buildCoreSummaryItems = (
  response: ClaudeDocumentTranslationResponse,
): string[] => {
  return normalizeTextItems(response.coreConcepts);
};

export const buildSummaryContentFromResponse = (
  response: ClaudeDocumentTranslationResponse,
): string => {
  const sections = [
    formatParagraphSection("한 줄 요약", response.purpose),
    formatBulletSection("사전 조건", response.prerequisites),
    formatBulletSection("문서 구조", response.workflow),
    formatBulletSection("핵심 요약", buildCoreSummaryItems(response)),
    formatBulletSection("API·설정 요약", response.apis),
    response.keyTerms.length > 0
      ? "핵심 용어\n\n아래 핵심키워드 영역에서 용어별 설명을 확인하세요."
      : null,
    formatBulletSection("코드 예제 설명", response.codeExamples) ??
      "코드 예제 설명\n\n원문에 코드 예제가 없습니다.",
    formatBulletSection("주의할 점", response.warnings) ??
      "주의할 점\n\n원문에 명확히 강조된 주의사항은 없습니다.",
    formatBulletSection("버전 정보", response.versionNotes),
  ].filter((section): section is string => Boolean(section));

  const ordered = SUMMARY_SECTION_ORDER.flatMap((title) => {
    const block = sections.find((entry) => {
      return entry === title || entry.startsWith(`${title}\n`);
    });

    return block ? [block] : [];
  });

  return ordered.join("\n\n").trim();
};

const mergeLegacyResponseFields = (
  raw: ClaudeDocumentTranslationRawResponse,
): ClaudeDocumentTranslationResponse => {
  const purpose =
    raw.purpose?.trim() ||
    raw.oneLineSummary?.trim() ||
    "";
  const workflow = normalizeTextItems(
    raw.workflow?.length ? raw.workflow : raw.documentStructure,
  );
  const coreConcepts = normalizeTextItems(
    raw.coreConcepts?.length ? raw.coreConcepts : raw.summaryBullets,
  );
  const codeExamples = normalizeTextItems(
    raw.codeExamples?.length
      ? raw.codeExamples
      : raw.codeExamplePoints?.length
        ? raw.codeExamplePoints
        : raw.codeExampleDescription
          ? [raw.codeExampleDescription]
          : [],
  );
  const warnings = normalizeTextItems(
    raw.warnings?.length ? raw.warnings : raw.cautions,
  );

  return {
    documentType: normalizeDocumentType(raw.documentType),
    title: raw.title?.trim() ?? "",
    purpose,
    prerequisites: normalizeTextItems(raw.prerequisites),
    coreConcepts,
    workflow,
    apis: normalizeTextItems(raw.apis),
    codeExamples,
    warnings,
    versionNotes: normalizeTextItems(raw.versionNotes),
    unknowns: normalizeTextItems(raw.unknowns),
    keyTerms: normalizeKeyTerms(raw.keyTerms),
  };
};

export const buildTranslationWarnings = (
  response: ClaudeDocumentTranslationResponse,
): string[] => {
  return response.unknowns.map((item) => `원문 불명확: ${item}`);
};

export const validateClaudeTranslationResponse = (
  response: ClaudeDocumentTranslationRawResponse,
): ClaudeDocumentTranslationResponse => {
  const normalized = mergeLegacyResponseFields(response);

  if (!normalized.title) {
    throw new Error("Claude 응답에 title이 없습니다.");
  }

  if (!normalized.purpose && normalized.coreConcepts.length === 0) {
    throw new Error("Claude 응답에 요약 내용이 없습니다.");
  }

  if (normalized.workflow.length === 0 && normalized.coreConcepts.length === 0) {
    throw new Error("Claude 응답에 문서 구조 또는 핵심 개념이 없습니다.");
  }

  return normalized;
};
