import type { DocumentCodeBlock } from "@/types/document-code-block";
import type { DocumentImage } from "@/types/document-image";
import type { DocumentType } from "@/types/claude-document-translation";

export interface KeywordTerm {
  term: string;
  description: string;
  isCoreKeyword: boolean;
}

export interface TranslationHistoryItem {
  id: string;
  documentId: string;
  title: string;
  fullTitle?: string;
  url: string | null;
  historySummary: string;
  originalContent: string | null;
  translatedSummaryContent: string;
  translatedFullContent: string;
  /** 레거시 호환 — translatedSummaryContent와 동일 */
  translatedContent: string;
  summaryTerms: KeywordTerm[];
  documentImages: DocumentImage[];
  documentCodeBlocks: DocumentCodeBlock[];
  documentType: DocumentType;
  warnings: string[];
  createdAt: string;
}

export interface DocumentTranslationResult {
  id: string;
  documentId: string;
  title: string;
  fullTitle?: string;
  url: string | null;
  originalContent: string;
  translatedSummaryContent: string;
  translatedFullContent: string;
  /** 레거시 호환 — translatedSummaryContent와 동일 */
  translatedContent: string;
  summaryTerms: KeywordTerm[];
  documentImages: DocumentImage[];
  documentCodeBlocks: DocumentCodeBlock[];
  documentType: DocumentType;
  warnings: string[];
  createdAt: string;
}

export interface TranslationHistoryQuery {
  dateKey?: string;
  page?: number;
  pageSize?: number;
}

export interface TranslationHistoryResponse {
  items: TranslationHistoryItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  dateKey: string;
}

export interface TranslationHistoryDateKeysResponse {
  dateKeys: string[];
}
