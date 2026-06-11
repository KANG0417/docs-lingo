import type { DocumentCodeBlock } from "@/types/document-code-block";
import type { DocumentImage } from "@/types/document-image";

export interface KeywordTerm {
  term: string;
  description: string;
  isCoreKeyword: boolean;
}

export interface TranslationHistoryItem {
  id: string;
  documentId: string;
  title: string;
  url: string | null;
  originalContent: string | null;
  translatedContent: string;
  summaryTerms: KeywordTerm[];
  documentImages: DocumentImage[];
  documentCodeBlocks: DocumentCodeBlock[];
  createdAt: string;
}

export interface DocumentTranslationResult {
  id: string;
  documentId: string;
  title: string;
  url: string | null;
  originalContent: string;
  translatedContent: string;
  summaryTerms: KeywordTerm[];
  documentImages: DocumentImage[];
  documentCodeBlocks: DocumentCodeBlock[];
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
