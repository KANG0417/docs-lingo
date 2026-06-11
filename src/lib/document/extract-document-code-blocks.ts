import { extractDocumentCodeBlocksFromHtml } from "@/lib/document/extract-document-code-blocks-from-html";
import { extractDocumentCodeBlocksFromMarkdown } from "@/lib/document/extract-document-code-blocks-from-markdown";
import { fetchDocMarkdown } from "@/lib/document/fetch-doc-markdown";
import type { DocumentCodeBlock } from "@/types/document-code-block";

const hasPackageManagerVariants = (blocks: DocumentCodeBlock[]): boolean => {
  return blocks.some(
    (block) =>
      block.variants.length > 1 &&
      block.variants.every((variant) => variant.packageManager.length > 0),
  );
};

export const extractDocumentCodeBlocks = async (
  html: string,
  pageUrl: string,
): Promise<DocumentCodeBlock[]> => {
  const markdownDocument = await fetchDocMarkdown(pageUrl);

  if (markdownDocument) {
    const markdownBlocks = extractDocumentCodeBlocksFromMarkdown(
      markdownDocument.markdown,
    );

    if (markdownBlocks.length > 0) {
      return markdownBlocks;
    }
  }

  const htmlBlocks = extractDocumentCodeBlocksFromHtml(html, pageUrl);

  if (hasPackageManagerVariants(htmlBlocks)) {
    return htmlBlocks;
  }

  return htmlBlocks.filter((block) =>
    block.variants.some((variant) => variant.code.trim().length > 0),
  );
};
