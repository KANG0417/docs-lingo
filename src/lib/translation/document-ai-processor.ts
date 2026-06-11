import { MAX_AI_INPUT_LENGTH } from "@/constants/document-pipeline";
import { extractKeywordTermsFallback } from "@/lib/translation/keyword-extractor-fallback";
import { translateWithFallbackApi } from "@/lib/translation/fallback-translator";
import {
  generateGeminiJson,
  isGeminiConfigured,
} from "@/lib/gemini/gemini-client";
import { mergeDocumentImageCaptions } from "@/lib/translation/merge-document-images";
import { needsTranslation } from "@/lib/translation/translate-content";
import {
  combineTranslationErrors,
  normalizeFallbackError,
  normalizeGeminiError,
  TranslationError,
} from "@/lib/translation/translation-errors";
import type { UserAiCredentials } from "@/types/ai-settings";
import type { DocumentCodeBlock } from "@/types/document-code-block";
import type { DocumentImage } from "@/types/document-image";
import { normalizeTranslatedLayout } from "@/lib/translation/normalize-translated-layout";
import { buildInterpretationPrompt } from "@/lib/translation/translation-interpretation-prompt";
import { normalizeSummaryTerms } from "@/lib/translation/summary-terms-normalizer";
import type { KeywordTerm } from "@/types/translation";

interface GeminiDocumentResponse {
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
  translatedContent: string;
  summaryTerms: KeywordTerm[];
  documentImages: DocumentImage[];
  documentCodeBlocks: DocumentCodeBlock[];
  usedFallback: boolean;
}

const normalizeTranslatedContent = (content: string): string => {
  return normalizeTranslatedLayout(content);
};

const processWithGemini = async (
  title: string,
  aiInput: string,
  sourceImages: DocumentImage[],
  sourceCodeBlocks: DocumentCodeBlock[],
  userCredentials?: UserAiCredentials | null,
): Promise<ProcessedDocument> => {
  const limitedInput = aiInput.slice(0, MAX_AI_INPUT_LENGTH);
  const prompt = buildInterpretationPrompt(title, limitedInput);

  try {
    const response = await generateGeminiJson<GeminiDocumentResponse>(prompt, {
      userCredentials,
    });

    if (!response.translatedContent?.trim()) {
      throw normalizeGeminiError(
        new Error("Gemini 번역 결과가 비어 있습니다."),
        { hasUserApiKey: Boolean(userCredentials?.apiKey) },
      );
    }

    return {
      translatedContent: normalizeTranslatedContent(response.translatedContent),
      summaryTerms: normalizeSummaryTerms(response.summaryTerms ?? []),
      documentImages: mergeDocumentImageCaptions(
        sourceImages,
        response.imageDescriptions ?? [],
      ),
      documentCodeBlocks: sourceCodeBlocks,
      usedFallback: false,
    };
  } catch (error) {
    if (error instanceof TranslationError) {
      throw error;
    }

    throw normalizeGeminiError(error, {
      hasUserApiKey: Boolean(userCredentials?.apiKey),
    });
  }
};

const processWithFallback = async (
  title: string,
  originalContent: string,
  refinedAiInput: string,
  sourceImages: DocumentImage[],
  sourceCodeBlocks: DocumentCodeBlock[],
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

    const translatedContent = normalizeTranslatedContent(
      translatedParagraphs.join("\n\n"),
    );

    return {
      translatedContent,
      summaryTerms: extractKeywordTermsFallback(
        refinedAiInput,
        translatedContent,
        title,
      ),
      documentImages: mergeDocumentImageCaptions(sourceImages),
      documentCodeBlocks: sourceCodeBlocks,
      usedFallback: true,
    };
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
  sourceImages: DocumentImage[] = [],
  sourceCodeBlocks: DocumentCodeBlock[] = [],
  userCredentials?: UserAiCredentials | null,
): Promise<ProcessedDocument> => {
  const trimmedContent = originalContent.trim();
  const trimmedAiInput = refinedAiInput.trim();

  if (!trimmedContent || !trimmedAiInput) {
    return {
      translatedContent: "",
      summaryTerms: [],
      documentImages: [],
      documentCodeBlocks: [],
      usedFallback: false,
    };
  }

  if (!needsTranslation(trimmedContent)) {
    return {
      translatedContent: trimmedContent,
      summaryTerms: extractKeywordTermsFallback(
        trimmedAiInput,
        trimmedContent,
        title,
      ),
      documentImages: mergeDocumentImageCaptions(sourceImages),
      documentCodeBlocks: sourceCodeBlocks,
      usedFallback: false,
    };
  }

  let geminiError: TranslationError | null = null;

  if (isGeminiConfigured(userCredentials)) {
    try {
      return await processWithGemini(
        title,
        trimmedAiInput,
        sourceImages,
        sourceCodeBlocks,
        userCredentials,
      );
    } catch (error) {
      geminiError =
        error instanceof TranslationError
          ? error
          : normalizeGeminiError(error, {
              hasUserApiKey: Boolean(userCredentials?.apiKey),
            });
    }
  } else {
    geminiError = normalizeGeminiError(
      new Error("사용 가능한 Gemini API 키가 없습니다."),
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
    );
  } catch (error) {
    const fallbackError =
      error instanceof TranslationError
        ? error
        : normalizeFallbackError(error);

    throw combineTranslationErrors(geminiError, fallbackError);
  }
};
