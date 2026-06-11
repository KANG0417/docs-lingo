import type { DocumentCodeBlock } from "@/types/document-code-block";

export const groupDocumentCodeBlocksBySectionIndex = (
  codeBlocks: DocumentCodeBlock[],
): Map<number, DocumentCodeBlock[]> => {
  const grouped = new Map<number, DocumentCodeBlock[]>();

  codeBlocks.forEach((block) => {
    const sectionBlocks = grouped.get(block.sectionIndex) ?? [];
    sectionBlocks.push(block);
    grouped.set(block.sectionIndex, sectionBlocks);
  });

  return grouped;
};
