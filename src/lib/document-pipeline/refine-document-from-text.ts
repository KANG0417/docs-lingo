import {
  buildOriginalContent,
  prepareAiInput,
  prepareSummaryAiInput,
} from "@/lib/document-pipeline/prepare-ai-input";
import { classifyDocumentType } from "@/lib/document-pipeline/classify-document-type";
import { filterImportantParagraphs } from "@/lib/document-pipeline/filter-importance";
import { splitMarkdownParagraphs } from "@/lib/document-pipeline/split-markdown-paragraphs";
import { splitParagraphs } from "@/lib/document-pipeline/split-paragraphs";
import { extractDocumentCodeBlocksFromMarkdown } from "@/lib/document/extract-document-code-blocks-from-markdown";
import {
  containsMarkdownCodeFences,
  stripMarkdownCodeFences,
} from "@/lib/document/strip-markdown-code-fences";
import { buildTextDocumentUrl } from "@/lib/document/text-document-url";
import { mergePreservedCodeBlocksForClaude } from "@/lib/document-pipeline/merge-preserved-code-blocks";
import { DEFAULT_TEXT_DOCUMENT_TITLE } from "@/lib/translation/engine/generate-text-document-title";
import { TranslationError } from "@/lib/translation/translation-errors";
import type { RefinedDocument } from "@/types/document-pipeline";

const buildRawParagraphs = (text: string): string[] => {
  if (containsMarkdownCodeFences(text) || /^#{1,3}\s/m.test(text)) {
    return splitMarkdownParagraphs(stripMarkdownCodeFences(text));
  }

  return splitParagraphs(stripMarkdownCodeFences(text));
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
  const paragraphs = filterImportantParagraphs(buildRawParagraphs(trimmedText));
  const documentUrl = buildTextDocumentUrl(trimmedText);
  const proseForClaude = paragraphs.map((paragraph) => paragraph.text).join("\n\n");
  const claudeTranslationRequest = {
    documentType: classifyDocumentType({
      url: documentUrl,
      title: documentTitle,
      extractedText: proseForClaude,
    }),
    sourceTitle: documentTitle,
    sourceUrl: documentUrl,
    extractedText: proseForClaude.slice(0, 10000),
    preservedCodeBlocks: mergePreservedCodeBlocksForClaude(
      [],
      documentCodeBlocks,
    ),
    glossary: [],
  };

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
    "markdown",
  );
  const summaryAiInput = prepareSummaryAiInput(
    documentTitle,
    paragraphs,
    [],
    documentCodeBlocks,
    "markdown",
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
    summaryAiInput,
    extractionSource: "markdown",
    documentType: claudeTranslationRequest.documentType,
    claudeTranslationRequest,
  };
};
