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
  originalContent: string;
  aiInput: string;
}
