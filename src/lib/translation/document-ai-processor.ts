import { MAX_AI_INPUT_LENGTH } from "@/constants/document-pipeline";
import { extractKeywordTermsFallback } from "@/lib/translation/keyword-extractor-fallback";
import { translateWithFallbackApi } from "@/lib/translation/engine/fallback-translator";
import {
  generateClaudeJson,
  isClaudeConfigured,
} from "@/lib/claude/claude-client";
import { mergeDocumentImageCaptions } from "@/lib/translation/merge-document-images";
import {
  buildSummaryContentFromResponse,
  buildTranslationWarnings,
  mapKeyTermsToSummaryTerms,
} from "@/lib/translation/map-claude-translation-response";
import { needsTranslation } from "@/lib/translation/engine/translate-content";
import {
  combineTranslationErrors,
  normalizeFallbackError,
  normalizeClaudeError,
  TranslationError,
} from "@/lib/translation/translation-errors";
import { buildSummaryTranslationPrompt } from "@/lib/translation/prompt/translation-summary-prompt";
import { normalizeInlineMarkupSource } from "@/lib/translation/markup/inline-markup-utils";
import { normalizeTranslatedLayout } from "@/lib/translation/markup/normalize-translated-layout";
import { normalizeTerminologyMarkup } from "@/lib/translation/markup/normalize-terminology-markup";
import { normalizeSummaryTerms } from "@/lib/translation/markup/summary-terms-normalizer";
import { translateDocumentWithClaude } from "@/services/claude-translation-service";
import type { UserAiCredentials } from "@/types/ai-settings";
import type { DocumentCodeBlock } from "@/types/document-code-block";
import type { DocumentImage } from "@/types/document-image";
import type {
  DocumentType,
  ClaudeTranslationRequest,
} from "@/types/claude-document-translation";
import type { KeywordTerm } from "@/types/translation";

interface ClaudeSummaryResponse {
  translatedTitle?: string;
  translatedContent: string;
  summaryTerms: Array<{
    term: string;
    description: string;
    isCoreKeyword?: boolean;
  }>;
  imageDescriptions?: Array<{
    imageId: string;
    description: string;
  }>;
}

export interface ProcessedDocument {
  translatedTitle?: string;
  translatedSummaryContent: string;
  translatedFullContent: string;
  /** Backward-compatible alias for translatedSummaryContent. */
  translatedContent: string;
  summaryTerms: KeywordTerm[];
  documentImages: DocumentImage[];
  documentCodeBlocks: DocumentCodeBlock[];
  usedFallback: boolean;
  documentType: DocumentType;
  warnings: string[];
}

export const normalizeTranslatedContent = (content: string): string => {
  return normalizeTerminologyMarkup(
    normalizeTranslatedLayout(normalizeInlineMarkupSource(content)),
  );
};

const buildProcessedDocument = ({
  translatedTitle,
  translatedSummaryContent,
  summaryTerms,
  documentImages,
  documentCodeBlocks,
  usedFallback,
  documentType,
  warnings,
}: {
  translatedTitle?: string;
  translatedSummaryContent: string;
  summaryTerms: KeywordTerm[];
  documentImages: DocumentImage[];
  documentCodeBlocks: DocumentCodeBlock[];
  usedFallback: boolean;
  documentType: DocumentType;
  warnings: string[];
}): ProcessedDocument => {
  const summary = translatedSummaryContent;

  return {
    translatedTitle,
    translatedSummaryContent: summary,
    translatedFullContent: summary,
    translatedContent: summary,
    summaryTerms,
    documentImages,
    documentCodeBlocks,
    usedFallback,
    documentType,
    warnings,
  };
};

const processWithLegacyClaude = async (
  title: string,
  summaryAiInput: string,
  sourceImages: DocumentImage[],
  sourceCodeBlocks: DocumentCodeBlock[],
  userCredentials?: UserAiCredentials | null,
): Promise<ProcessedDocument> => {
  const summaryResponse = await generateClaudeJson<ClaudeSummaryResponse>(
    buildSummaryTranslationPrompt(title, summaryAiInput),
    { userCredentials },
  );

  if (!summaryResponse.translatedContent?.trim()) {
    throw normalizeClaudeError(
      new Error("Claude 핵심 요약 번역 결과가 비어 있습니다."),
      { hasUserApiKey: Boolean(userCredentials?.apiKey) },
    );
  }

  const translatedSummaryContent = normalizeTranslatedContent(
    summaryResponse.translatedContent,
  );
  const summaryTerms = normalizeSummaryTerms(summaryResponse.summaryTerms ?? []);

  return buildProcessedDocument({
    translatedTitle: summaryResponse.translatedTitle?.trim() || undefined,
    translatedSummaryContent,
    summaryTerms:
      summaryTerms.length > 0
        ? summaryTerms
        : extractKeywordTermsFallback(
            summaryAiInput,
            translatedSummaryContent,
            title,
          ),
    documentImages: mergeDocumentImageCaptions(
      sourceImages,
      summaryResponse.imageDescriptions ?? [],
    ),
    documentCodeBlocks: sourceCodeBlocks,
    usedFallback: false,
    documentType: "other",
    warnings: [],
  });
};

const processWithStructuredClaude = async (
  claudeTranslationRequest: ClaudeTranslationRequest,
  sourceImages: DocumentImage[],
  sourceCodeBlocks: DocumentCodeBlock[],
  userCredentials?: UserAiCredentials | null,
): Promise<ProcessedDocument> => {
  const structuredResponse = await translateDocumentWithClaude(
    claudeTranslationRequest,
    userCredentials,
  );

  const translatedSummaryContent = normalizeTranslatedContent(
    buildSummaryContentFromResponse(structuredResponse),
  );
  const summaryTerms = mapKeyTermsToSummaryTerms(structuredResponse.keyTerms);

  return buildProcessedDocument({
    translatedTitle: structuredResponse.title,
    translatedSummaryContent,
    summaryTerms:
      summaryTerms.length > 0
        ? summaryTerms
        : extractKeywordTermsFallback(
            claudeTranslationRequest.extractedText,
            translatedSummaryContent,
            claudeTranslationRequest.sourceTitle,
          ),
    documentImages: mergeDocumentImageCaptions(sourceImages),
    documentCodeBlocks: sourceCodeBlocks,
    usedFallback: false,
    documentType: structuredResponse.documentType,
    warnings: buildTranslationWarnings(structuredResponse),
  });
};

const processWithFallback = async (
  title: string,
  originalContent: string,
  refinedAiInput: string,
  sourceImages: DocumentImage[],
  sourceCodeBlocks: DocumentCodeBlock[],
  documentType: DocumentType,
): Promise<ProcessedDocument> => {
  const limitedContent = originalContent.slice(0, MAX_AI_INPUT_LENGTH);

  try {
    const paragraphs = limitedContent
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0);

    const translatedParagraphs =
      paragraphs.length > 0
        ? await Promise.all(
            paragraphs.map((paragraph) => translateWithFallbackApi(paragraph)),
          )
        : [await translateWithFallbackApi(limitedContent)];

    const translatedSummaryContent = normalizeTranslatedContent(
      translatedParagraphs.join("\n\n"),
    );

    return buildProcessedDocument({
      translatedSummaryContent,
      summaryTerms: extractKeywordTermsFallback(
        refinedAiInput,
        translatedSummaryContent,
        title,
      ),
      documentImages: mergeDocumentImageCaptions(sourceImages),
      documentCodeBlocks: sourceCodeBlocks,
      usedFallback: true,
      documentType,
      warnings: [
        "Claude API를 사용할 수 없어 기본 번역 엔진으로 처리했습니다. 핵심 요약 품질이 제한될 수 있습니다.",
      ],
    });
  } catch (error) {
    if (error instanceof TranslationError) {
      throw error;
    }

    throw normalizeFallbackError(error);
  }
};

export const processRefinedDocument = async (
  title: string,
  originalContent: string,
  refinedAiInput: string,
  summaryAiInput: string,
  claudeTranslationRequest: ClaudeTranslationRequest,
  sourceImages: DocumentImage[] = [],
  sourceCodeBlocks: DocumentCodeBlock[] = [],
  userCredentials?: UserAiCredentials | null,
): Promise<ProcessedDocument> => {
  const trimmedContent = originalContent.trim();
  const trimmedAiInput = refinedAiInput.trim();
  const trimmedSummaryAiInput =
    summaryAiInput.trim() || trimmedAiInput.slice(0, MAX_AI_INPUT_LENGTH);

  if (!trimmedContent || !trimmedAiInput) {
    return buildProcessedDocument({
      translatedSummaryContent: "",
      summaryTerms: [],
      documentImages: [],
      documentCodeBlocks: [],
      usedFallback: false,
      documentType: claudeTranslationRequest.documentType,
      warnings: [],
    });
  }

  if (!needsTranslation(trimmedContent)) {
    return buildProcessedDocument({
      translatedSummaryContent: trimmedContent,
      summaryTerms: extractKeywordTermsFallback(
        trimmedAiInput,
        trimmedContent,
        title,
      ),
      documentImages: mergeDocumentImageCaptions(sourceImages),
      documentCodeBlocks: sourceCodeBlocks,
      usedFallback: false,
      documentType: claudeTranslationRequest.documentType,
      warnings: [],
    });
  }

  let claudeError: TranslationError | null = null;

  if (isClaudeConfigured(userCredentials)) {
    try {
      return await processWithStructuredClaude(
        claudeTranslationRequest,
        sourceImages,
        sourceCodeBlocks,
        userCredentials,
      );
    } catch {
      // legacy/MyMemory 단계는 형식과 품질이 크게 달라 결과가 들쑤시는 주된
      // 원인이 된다. 단계를 낮추기 전에 동일한 구조화 프롬프트를 한 번 더
      // 시도해 일관된 품질을 우선 확보한다.
      try {
        return await processWithStructuredClaude(
          claudeTranslationRequest,
          sourceImages,
          sourceCodeBlocks,
          userCredentials,
        );
      } catch (error) {
        claudeError =
          error instanceof TranslationError
            ? error
            : normalizeClaudeError(error, {
                hasUserApiKey: Boolean(userCredentials?.apiKey),
              });
      }

      try {
        return await processWithLegacyClaude(
          title,
          trimmedSummaryAiInput,
          sourceImages,
          sourceCodeBlocks,
          userCredentials,
        );
      } catch (legacyError) {
        claudeError =
          legacyError instanceof TranslationError
            ? legacyError
            : normalizeClaudeError(legacyError, {
                hasUserApiKey: Boolean(userCredentials?.apiKey),
              });
      }
    }
  } else {
    claudeError = normalizeClaudeError(
      new Error("사용 가능한 Claude API 키가 없습니다."),
      { hasUserApiKey: false },
    );
  }

  try {
    return await processWithFallback(
      title,
      trimmedContent,
      trimmedAiInput,
      sourceImages,
      sourceCodeBlocks,
      claudeTranslationRequest.documentType,
    );
  } catch (error) {
    const fallbackError =
      error instanceof TranslationError
        ? error
        : normalizeFallbackError(error);

    throw combineTranslationErrors(claudeError, fallbackError);
  }
};
