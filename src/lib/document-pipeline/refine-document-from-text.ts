import {
  buildOriginalContent,
  prepareAiInput,
} from "@/lib/document-pipeline/prepare-ai-input";
import { splitParagraphs } from "@/lib/document-pipeline/split-paragraphs";
import { buildTextDocumentUrl } from "@/lib/text-document-url";
import { TranslationError } from "@/lib/translation-errors";
import type { RefinedDocument, RefinedParagraph } from "@/types/document-pipeline";

const TEXT_DOCUMENT_TITLE = "직접 입력한 텍스트";

const buildRefinedParagraphs = (textContent: string): RefinedParagraph[] => {
  return splitParagraphs(textContent).map((paragraph, index) => ({
    index: index + 1,
    text: paragraph,
    score: 1,
  }));
};

export const refineDocumentFromText = (text: string): RefinedDocument => {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new TranslationError(
      "DOCUMENT_EMPTY",
      "번역할 텍스트를 입력해 주세요.",
      "empty text input",
    );
  }

  const paragraphs = buildRefinedParagraphs(trimmedText);

  if (paragraphs.length === 0) {
    throw new TranslationError(
      "DOCUMENT_EMPTY",
      "번역할 수 있는 문단을 찾지 못했습니다.\n더 긴 텍스트를 입력해 보세요.",
      "no paragraphs from text",
    );
  }

  const originalContent = buildOriginalContent(paragraphs);
  const aiInput = prepareAiInput(TEXT_DOCUMENT_TITLE, paragraphs);

  return {
    title: TEXT_DOCUMENT_TITLE,
    url: buildTextDocumentUrl(trimmedText),
    rawParagraphCount: paragraphs.length,
    filteredParagraphCount: paragraphs.length,
    paragraphs,
    originalContent,
    aiInput,
  };
};
