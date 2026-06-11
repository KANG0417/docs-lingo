import { extractWithReadability } from "@/lib/document-pipeline/extract-readability";
import { extractLinkedSectionHeadings } from "@/lib/document-pipeline/extract-linked-section-headings";
import { fetchHtmlDocument } from "@/lib/document-pipeline/fetch-html";
import { filterImportantParagraphs } from "@/lib/document-pipeline/filter-importance";
import {
  buildOriginalContent,
  prepareAiInput,
} from "@/lib/document-pipeline/prepare-ai-input";
import { splitParagraphs } from "@/lib/document-pipeline/split-paragraphs";
import { TranslationError } from "@/lib/translation-errors";
import type { RefinedDocument } from "@/types/document-pipeline";

export const refineDocumentFromUrl = async (
  url: string,
): Promise<RefinedDocument> => {
  const fetchedDocument = await fetchHtmlDocument(url);
  const extractedDocument = extractWithReadability(
    fetchedDocument.html,
    fetchedDocument.url,
  );

  if (!extractedDocument.textContent) {
    throw new TranslationError(
      "DOCUMENT_EMPTY",
      "문서에서 읽을 수 있는 본문을 찾지 못했습니다.\n다른 페이지를 시도해 보세요.",
      "readability empty",
    );
  }

  const linkedSectionHeadings = extractLinkedSectionHeadings(fetchedDocument.html);
  const rawParagraphs = splitParagraphs(
    extractedDocument.textContent,
    linkedSectionHeadings,
  );
  const filteredParagraphs = filterImportantParagraphs(rawParagraphs);

  if (filteredParagraphs.length === 0) {
    throw new TranslationError(
      "DOCUMENT_EMPTY",
      "중요한 문단을 찾지 못했습니다.\n다른 문서 URL을 시도해 보세요.",
      "no important paragraphs",
    );
  }

  const originalContent = buildOriginalContent(filteredParagraphs);
  const aiInput = prepareAiInput(extractedDocument.title, filteredParagraphs);

  return {
    title: extractedDocument.title,
    url: fetchedDocument.url,
    rawParagraphCount: rawParagraphs.length,
    filteredParagraphCount: filteredParagraphs.length,
    paragraphs: filteredParagraphs,
    originalContent,
    aiInput,
  };
};
