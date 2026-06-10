import { MIN_PARAGRAPH_LENGTH } from "@/constants/document-pipeline";

const normalizeParagraph = (paragraph: string): string => {
  return paragraph.replace(/\s+/g, " ").trim();
};

export const splitParagraphs = (textContent: string): string[] => {
  const blocks = textContent
    .split(/\n{2,}/)
    .map(normalizeParagraph)
    .filter((paragraph) => paragraph.length >= MIN_PARAGRAPH_LENGTH);

  if (blocks.length > 0) {
    return blocks;
  }

  return textContent
    .split(/\n/)
    .map(normalizeParagraph)
    .filter((paragraph) => paragraph.length >= MIN_PARAGRAPH_LENGTH);
};
