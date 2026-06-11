import {
  buildOriginalContent,
  prepareAiInput,
} from "@/lib/document-pipeline/prepare-ai-input";
import { splitParagraphs } from "@/lib/document-pipeline/split-paragraphs";
import { extractDocumentCodeBlocksFromMarkdown } from "@/lib/document/extract-document-code-blocks-from-markdown";
import { stripMarkdownCodeFences } from "@/lib/document/strip-markdown-code-fences";
import { buildTextDocumentUrl } from "@/lib/document/text-document-url";
import { DEFAULT_TEXT_DOCUMENT_TITLE } from "@/lib/translation/generate-text-document-title";
import { TranslationError } from "@/lib/translation/translation-errors";
import type { RefinedDocument, RefinedParagraph } from "@/types/document-pipeline";

const buildRefinedParagraphs = (textContent: string): RefinedParagraph[] => {
  return splitParagraphs(textContent).map((paragraph, index) => ({
    index: index + 1,
    text: paragraph,
    score: 1,
  }));
};

export const refineDocumentFromText = (
  text: string,
  title: string = DEFAULT_TEXT_DOCUMENT_TITLE,
): RefinedDocument => {
  const trimmedText = text.trim();
  const documentTitle = title.trim() || DEFAULT_TEXT_DOCUMENT_TITLE;

  if (!trimmedText) {
    throw new TranslationError(
      "DOCUMENT_EMPTY",
      "번역할 텍스트를 입력해 주세요.",
      "empty text input",
    );
  }

  const documentCodeBlocks = extractDocumentCodeBlocksFromMarkdown(trimmedText);
  const proseText = stripMarkdownCodeFences(trimmedText);
  const paragraphs = buildRefinedParagraphs(proseText);

  if (paragraphs.length === 0 && documentCodeBlocks.length === 0) {
    throw new TranslationError(
      "DOCUMENT_EMPTY",
      "번역할 수 있는 문단을 찾지 못했습니다.\n더 긴 텍스트를 입력해 보세요.",
      "no paragraphs from text",
    );
  }

  const originalContent = buildOriginalContent(
    documentTitle,
    paragraphs,
    [],
    documentCodeBlocks,
  );
  const aiInput = prepareAiInput(
    documentTitle,
    paragraphs,
    [],
    documentCodeBlocks,
  );

  return {
    title: documentTitle,
    url: buildTextDocumentUrl(trimmedText),
    rawParagraphCount: paragraphs.length,
    filteredParagraphCount: paragraphs.length,
    paragraphs,
    documentImages: [],
    documentCodeBlocks,
    originalContent,
    aiInput,
  };
};
