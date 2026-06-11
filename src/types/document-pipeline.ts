import type { DocumentCodeBlock } from "@/types/document-code-block";
import type { DocumentImage } from "@/types/document-image";

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
}
