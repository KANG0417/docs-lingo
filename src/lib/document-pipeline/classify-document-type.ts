import { DOCUMENT_TYPE_LABELS } from "@/constants/document-type-priority-rules";
import type { DocumentType } from "@/types/claude-document-translation";

interface ClassifyDocumentTypeParams {
  url: string | null;
  title: string;
  extractedText: string;
}

const API_REFERENCE_URL_PATTERNS: RegExp[] = [
  /\/api(?:\/|$)/i,
  /\/reference(?:\/|$)/i,
  /\/rest-api/i,
  /\/graphql/i,
];

const TUTORIAL_URL_PATTERNS: RegExp[] = [
  /\/tutorial/i,
  /\/guide/i,
  /\/learn/i,
  /\/getting-started/i,
  /\/quickstart/i,
];

const MIGRATION_URL_PATTERNS: RegExp[] = [
  /\/migration/i,
  /\/upgrade/i,
  /\/upgrading/i,
];

const CONFIG_URL_PATTERNS: RegExp[] = [
  /\/configuration/i,
  /\/config(?:\/|$)/i,
  /next\.config/i,
];

const TROUBLESHOOTING_URL_PATTERNS: RegExp[] = [
  /\/troubleshoot/i,
  /\/errors?/i,
  /\/debug/i,
  /\/faq/i,
];

const ARCHITECTURE_URL_PATTERNS: RegExp[] = [
  /\/architecture/i,
  /\/internals?/i,
  /\/concepts?/i,
];

const countPatternMatches = (
  text: string,
  patterns: RegExp[],
): number => {
  return patterns.reduce((count, pattern) => {
    return count + (pattern.test(text) ? 1 : 0);
  }, 0);
};

export const classifyDocumentType = ({
  url,
  title,
  extractedText,
}: ClassifyDocumentTypeParams): DocumentType => {
  const urlText = url ?? "";
  const combined = `${urlText}\n${title}\n${extractedText.slice(0, 4000)}`;

  if (countPatternMatches(urlText, MIGRATION_URL_PATTERNS) > 0) {
    return "migration_guide";
  }

  if (countPatternMatches(urlText, TROUBLESHOOTING_URL_PATTERNS) > 0) {
    return "troubleshooting";
  }

  if (countPatternMatches(urlText, CONFIG_URL_PATTERNS) > 0) {
    return "configuration_guide";
  }

  if (countPatternMatches(urlText, ARCHITECTURE_URL_PATTERNS) > 0) {
    return "architecture";
  }

  if (
    countPatternMatches(urlText, API_REFERENCE_URL_PATTERNS) > 0 ||
    /\b(API Reference|Parameters|Returns|Request Body|Response Body)\b/i.test(
      combined,
    )
  ) {
    return "api_reference";
  }

  if (
    countPatternMatches(urlText, TUTORIAL_URL_PATTERNS) > 0 ||
    /\b(step\s+\d+|tutorial|walkthrough|getting started)\b/i.test(combined)
  ) {
    return "tutorial";
  }

  if (
    /\b(overview|introduction|what is|concept|fundamentals)\b/i.test(combined)
  ) {
    return "concept_explanation";
  }

  if (/\/docs?(?:\/|$)/i.test(urlText) || /documentation/i.test(title)) {
    return "concept_explanation";
  }

  return "other";
};

export const getDocumentTypeLabel = (documentType: DocumentType): string => {
  return DOCUMENT_TYPE_LABELS[documentType] ?? DOCUMENT_TYPE_LABELS.other;
};
