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
  createdAt: string;
}
