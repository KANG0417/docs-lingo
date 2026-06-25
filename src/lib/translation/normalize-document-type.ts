import {
  DOCUMENT_TYPE_PRIORITY_RULES,
  DOCUMENT_TYPE_SLUGS,
  type PrimaryDocumentType,
} from "@/constants/document-type-priority-rules";
import type { DocumentType } from "@/types/claude-document-translation";

const LEGACY_DOCUMENT_TYPE_MAP: Record<string, DocumentType> = {
  official_docs: "concept_explanation",
  blog_article: "other",
  release_note: "other",
  unknown: "other",
};

const DOCUMENT_TYPE_ALIASES: Record<string, DocumentType> = {
  concept: "concept_explanation",
  concept_explanation: "concept_explanation",
  "개념 설명": "concept_explanation",
  tutorial: "tutorial",
  튜토리얼: "tutorial",
  api_reference: "api_reference",
  "api reference": "api_reference",
  configuration_guide: "configuration_guide",
  "설정 가이드": "configuration_guide",
  config_guide: "configuration_guide",
  migration_guide: "migration_guide",
  "마이그레이션 가이드": "migration_guide",
  migration: "migration_guide",
  troubleshooting: "troubleshooting",
  트러블슈팅: "troubleshooting",
  architecture: "architecture",
  "아키텍처 설명": "architecture",
  other: "other",
  기타: "other",
};

export const normalizeDocumentType = (raw: string | undefined): DocumentType => {
  const trimmed = raw?.trim() ?? "";

  if (!trimmed) {
    return "other";
  }

  const lowered = trimmed.toLowerCase().replace(/\s+/g, " ");

  if (DOCUMENT_TYPE_SLUGS.includes(lowered as PrimaryDocumentType)) {
    return lowered as DocumentType;
  }

  if (DOCUMENT_TYPE_ALIASES[lowered]) {
    return DOCUMENT_TYPE_ALIASES[lowered];
  }

  if (LEGACY_DOCUMENT_TYPE_MAP[lowered]) {
    return LEGACY_DOCUMENT_TYPE_MAP[lowered];
  }

  return "other";
};

export const getDocumentTypePriorityRule = (
  documentType: DocumentType,
): string => {
  const primary = normalizeDocumentType(documentType);

  if (primary in DOCUMENT_TYPE_PRIORITY_RULES) {
    return DOCUMENT_TYPE_PRIORITY_RULES[primary as PrimaryDocumentType];
  }

  return DOCUMENT_TYPE_PRIORITY_RULES.other;
};
