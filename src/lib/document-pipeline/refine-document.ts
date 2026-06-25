import { classifyDocumentType } from "@/lib/document-pipeline/classify-document-type";
import { extractStructuredHtml } from "@/lib/document-pipeline/extract-structured-html";
import { extractWithReadability } from "@/lib/document-pipeline/extract-readability";
import { extractLinkedSectionHeadings } from "@/lib/document-pipeline/extract-linked-section-headings";
import { fetchHtmlDocument } from "@/lib/document-pipeline/fetch-html";
import { filterImportantParagraphs } from "@/lib/document-pipeline/filter-importance";
import {
  buildOriginalContent,
  prepareAiInput,
  prepareSummaryAiInput,
} from "@/lib/document-pipeline/prepare-ai-input";
import { splitMarkdownParagraphs } from "@/lib/document-pipeline/split-markdown-paragraphs";
import { splitParagraphs } from "@/lib/document-pipeline/split-paragraphs";
import { extractDocumentImages } from "@/lib/document/extract-document-images";
import { extractDocumentCodeBlocks } from "@/lib/document/extract-document-code-blocks";
import {
  extractMarkdownTitle,
  fetchOfficialDocMarkdown,
} from "@/lib/document/fetch-official-doc-markdown";
import { stripMarkdownCodeFences } from "@/lib/document/strip-markdown-code-fences";
import { mergePreservedCodeBlocksForClaude } from "@/lib/document-pipeline/merge-preserved-code-blocks";
import { TranslationError } from "@/lib/translation/translation-errors";
import type { DocumentExtractionSource } from "@/constants/document-pipeline";
import type { RefinedDocument } from "@/types/document-pipeline";
import type {
  ClaudeTranslationRequest,
  StructuredExtractionResult,
} from "@/types/claude-document-translation";

const buildClaudeRequest = ({
  title,
  url,
  extractedText,
  preservedCodeBlocks,
  glossary,
}: {
  title: string;
  url: string;
  extractedText: string;
  preservedCodeBlocks: ClaudeTranslationRequest["preservedCodeBlocks"];
  glossary: ClaudeTranslationRequest["glossary"];
}): ClaudeTranslationRequest => {
  const documentType = classifyDocumentType({
    url,
    title,
    extractedText,
  });

  return {
    documentType,
    sourceTitle: title,
    sourceUrl: url,
    extractedText,
    preservedCodeBlocks,
    glossary,
  };
};

const resolveParagraphsFromUrl = ({
  markdown,
  structuredText,
  html,
  pageUrl,
  fallbackTitle,
}: {
  markdown: string | null;
  structuredText: string;
  html: string;
  pageUrl: string;
  fallbackTitle: string;
}): {
  title: string;
  rawParagraphs: string[];
  extractionSource: DocumentExtractionSource;
  extractedText: string;
} => {
  if (markdown) {
    const markdownTitle = extractMarkdownTitle(markdown);
    const proseText = stripMarkdownCodeFences(markdown);
    const markdownParagraphs = splitMarkdownParagraphs(proseText);

    if (markdownParagraphs.length > 0) {
      return {
        title: markdownTitle ?? fallbackTitle,
        rawParagraphs: markdownParagraphs,
        extractionSource: "markdown",
        extractedText: proseText,
      };
    }
  }

  if (structuredText.trim()) {
    const structuredParagraphs = splitParagraphs(structuredText);

    if (structuredParagraphs.length > 0) {
      return {
        title: fallbackTitle,
        rawParagraphs: structuredParagraphs,
        extractionSource: "readability",
        extractedText: structuredText,
      };
    }
  }

  const extractedDocument = extractWithReadability(html, pageUrl);
  const linkedSectionHeadings = extractLinkedSectionHeadings(html);

  if (!extractedDocument.textContent) {
    throw new TranslationError(
      "DOCUMENT_EMPTY",
      "문서에서 읽을 수 있는 본문을 찾지 못했습니다.\n다른 페이지를 시도해 보세요.",
      "readability empty",
    );
  }

  return {
    title: extractedDocument.title || fallbackTitle,
    rawParagraphs: splitParagraphs(
      extractedDocument.textContent,
      linkedSectionHeadings,
    ),
    extractionSource: "readability",
    extractedText: extractedDocument.textContent,
  };
};

export const refineDocumentFromUrl = async (
  url: string,
): Promise<RefinedDocument> => {
  const fetchedDocument = await fetchHtmlDocument(url);
  const markdownDocument = await fetchOfficialDocMarkdown(fetchedDocument.url);
  const readabilityFallback = extractWithReadability(
    fetchedDocument.html,
    fetchedDocument.url,
  );
  const structuredExtraction = ((): StructuredExtractionResult => {
    try {
      return extractStructuredHtml(
        fetchedDocument.html,
        fetchedDocument.url,
        readabilityFallback.title,
      );
    } catch (error) {
      console.error(
        "[refineDocumentFromUrl] structured html extraction failed",
        error instanceof Error ? error.message : "unknown",
      );

      return {
        sourceTitle: readabilityFallback.title,
        extractedText: "",
        preservedCodeBlocks: [],
        glossary: [],
      };
    }
  })();

  const { title, rawParagraphs, extractionSource, extractedText } =
    resolveParagraphsFromUrl({
      markdown: markdownDocument?.markdown ?? null,
      structuredText: structuredExtraction.extractedText,
      html: fetchedDocument.html,
      pageUrl: fetchedDocument.url,
      fallbackTitle:
        structuredExtraction.sourceTitle || readabilityFallback.title,
    });

  const documentImages = extractDocumentImages(
    fetchedDocument.html,
    fetchedDocument.url,
  );
  const documentCodeBlocks = await extractDocumentCodeBlocks(
    fetchedDocument.html,
    fetchedDocument.url,
  );
  const filteredParagraphs = filterImportantParagraphs(rawParagraphs);

  if (filteredParagraphs.length === 0) {
    throw new TranslationError(
      "DOCUMENT_EMPTY",
      "중요한 문단을 찾지 못했습니다.\n다른 문서 URL을 시도해 보세요.",
      "no important paragraphs",
    );
  }

  const claudeTranslationRequest = buildClaudeRequest({
    title,
    url: fetchedDocument.url,
    extractedText: extractedText.slice(0, 10000),
    preservedCodeBlocks: mergePreservedCodeBlocksForClaude(
      structuredExtraction.preservedCodeBlocks,
      documentCodeBlocks,
    ),
    glossary: structuredExtraction.glossary,
  });

  const originalContent = buildOriginalContent(
    title,
    filteredParagraphs,
    documentImages,
    documentCodeBlocks,
  );
  const aiInput = prepareAiInput(
    title,
    filteredParagraphs,
    documentImages,
    documentCodeBlocks,
    extractionSource,
  );
  const summaryAiInput = prepareSummaryAiInput(
    title,
    filteredParagraphs,
    documentImages,
    documentCodeBlocks,
    extractionSource,
  );

  return {
    title,
    url: fetchedDocument.url,
    rawParagraphCount: rawParagraphs.length,
    filteredParagraphCount: filteredParagraphs.length,
    paragraphs: filteredParagraphs,
    documentImages,
    documentCodeBlocks,
    originalContent,
    aiInput,
    summaryAiInput,
    extractionSource,
    documentType: claudeTranslationRequest.documentType,
    claudeTranslationRequest,
  };
};
