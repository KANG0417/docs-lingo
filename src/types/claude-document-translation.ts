export type DocumentType =
  | "concept_explanation"
  | "tutorial"
  | "api_reference"
  | "configuration_guide"
  | "migration_guide"
  | "troubleshooting"
  | "architecture"
  | "other"
  /** @deprecated 레거시 DB·응답 호환 */
  | "official_docs"
  /** @deprecated 레거시 DB·응답 호환 */
  | "blog_article"
  /** @deprecated 레거시 DB·응답 호환 */
  | "release_note"
  /** @deprecated 레거시 DB·응답 호환 */
  | "unknown";

export interface PreservedCodeBlock {
  id: string;
  language: string;
  code: string;
  label?: string | null;
  sectionHeading?: string | null;
}

export interface ClaudeGlossaryTerm {
  term: string;
  note?: string;
}

export interface ClaudeTranslationKeyTerm {
  term: string;
  translation: string;
  description: string;
}

export interface ClaudeDocumentTranslationResponse {
  documentType: DocumentType;
  title: string;
  purpose: string;
  prerequisites: string[];
  coreConcepts: string[];
  workflow: string[];
  apis: string[];
  codeExamples: string[];
  warnings: string[];
  versionNotes: string[];
  unknowns: string[];
  keyTerms: ClaudeTranslationKeyTerm[];
}

/** 레거시 응답 필드 — validate 시 신규 스키마로 병합 */
export interface LegacyClaudeTranslationFields {
  oneLineSummary?: string;
  documentStructure?: string[];
  summaryBullets?: string[];
  codeExamplePoints?: string[];
  codeExampleDescription?: string;
  cautions?: string[];
}

export type ClaudeDocumentTranslationRawResponse =
  ClaudeDocumentTranslationResponse &
    LegacyClaudeTranslationFields;

export interface ClaudeTranslationRequest {
  documentType: DocumentType;
  sourceTitle: string;
  sourceUrl: string | null;
  extractedText: string;
  preservedCodeBlocks: PreservedCodeBlock[];
  glossary: ClaudeGlossaryTerm[];
}

export interface StructuredExtractionResult {
  sourceTitle: string;
  extractedText: string;
  preservedCodeBlocks: PreservedCodeBlock[];
  glossary: ClaudeGlossaryTerm[];
}
