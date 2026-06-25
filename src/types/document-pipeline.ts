import type { DocumentCodeBlock } from "@/types/document-code-block";
import type { DocumentExtractionSource } from "@/constants/document-pipeline";
import type { DocumentImage } from "@/types/document-image";
import type {
  DocumentType,
  ClaudeTranslationRequest,
} from "@/types/claude-document-translation";

export interface RefinedParagraph {
  index: number;
  text: string;
  score: number;
}

export interface RefinedDocument {
  title: string;
  url: string;
  rawParagraphCount: number;
  filteredParagraphCount: number;
  paragraphs: RefinedParagraph[];
  documentImages: DocumentImage[];
  documentCodeBlocks: DocumentCodeBlock[];
  originalContent: string;
  aiInput: string;
  summaryAiInput: string;
  extractionSource: DocumentExtractionSource;
  documentType: DocumentType;
  claudeTranslationRequest: ClaudeTranslationRequest;
}
