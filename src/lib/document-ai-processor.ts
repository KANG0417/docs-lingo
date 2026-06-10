import { MAX_AI_INPUT_LENGTH } from "@/constants/document-pipeline";
import { extractKeywordTermsFallback } from "@/lib/keyword-extractor-fallback";
import { translateWithFallbackApi } from "@/lib/fallback-translator";
import {
  generateGeminiJson,
  isGeminiConfigured,
} from "@/lib/gemini-client";
import { needsTranslation } from "@/lib/translate-content";
import {
  combineTranslationErrors,
  normalizeFallbackError,
  normalizeGeminiError,
  TranslationError,
} from "@/lib/translation-errors";
import type { UserAiCredentials } from "@/types/ai-settings";
import type { KeywordTerm } from "@/types/translation";

interface GeminiDocumentResponse {
  translatedContent: string;
  summaryTerms: Array<{
    term: string;
    description: string;
    isCoreKeyword?: boolean;
  }>;
}

export interface ProcessedDocument {
  translatedContent: string;
  summaryTerms: KeywordTerm[];
  usedFallback: boolean;
}

const normalizeSummaryTerms = (
  summaryTerms: GeminiDocumentResponse["summaryTerms"],
): KeywordTerm[] => {
  return summaryTerms
    .map((item) => ({
      term: item.term.trim(),
      description: item.description.trim(),
      isCoreKeyword: Boolean(item.isCoreKeyword),
    }))
    .filter((item) => item.term && item.description)
    .slice(0, 8);
};

const buildInterpretationPrompt = (
  title: string,
  refinedAiInput: string,
): string => {
  return `당신은 기술 문서 해석 전문가입니다.
아래 입력은 URL 문서를 HTML fetch → Readability 본문 추출 → 문단 분리 → 중요도 필터를 거친 "정제 텍스트"입니다.

당신의 역할:
- HTML을 다시 읽거나 추측하지 마세요.
- 제공된 정제 텍스트만 해석하세요.
- 정제 텍스트를 한국어로 번역하고 핵심 키워드를 추출하세요.

문서 제목: ${title}

[정제된 AI 입력]
${refinedAiInput}

다음 JSON 형식으로만 응답하세요:
{
  "translatedContent": "한국어 번역 전체",
  "summaryTerms": [
    {
      "term": "API",
      "description": "용어 설명",
      "isCoreKeyword": true
    }
  ]
}

규칙:
- translatedContent는 문단 흐름을 유지한 한국어 번역
- API명, 함수명, 라이브러리명은 원문 유지
- summaryTerms는 최대 8개
- 핵심 용어 4개는 isCoreKeyword를 true로 설정
- description은 "용어이름: 용어설명" 형식의 한국어 설명`;
};

const processWithGemini = async (
  title: string,
  refinedAiInput: string,
  userCredentials?: UserAiCredentials | null,
): Promise<ProcessedDocument> => {
  const limitedInput = refinedAiInput.slice(0, MAX_AI_INPUT_LENGTH);
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
      translatedContent: response.translatedContent.trim(),
      summaryTerms: normalizeSummaryTerms(response.summaryTerms ?? []),
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
): Promise<ProcessedDocument> => {
  const limitedContent = originalContent.slice(0, MAX_AI_INPUT_LENGTH);

  try {
    const translatedContent = await translateWithFallbackApi(limitedContent);

    return {
      translatedContent,
      summaryTerms: extractKeywordTermsFallback(
        refinedAiInput,
        translatedContent,
        title,
      ),
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
  userCredentials?: UserAiCredentials | null,
): Promise<ProcessedDocument> => {
  const trimmedContent = originalContent.trim();
  const trimmedAiInput = refinedAiInput.trim();

  if (!trimmedContent || !trimmedAiInput) {
    return {
      translatedContent: "",
      summaryTerms: [],
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
      usedFallback: false,
    };
  }

  let geminiError: TranslationError | null = null;

  if (isGeminiConfigured(userCredentials)) {
    try {
      return await processWithGemini(title, trimmedAiInput, userCredentials);
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
    return await processWithFallback(title, trimmedContent, trimmedAiInput);
  } catch (error) {
    const fallbackError =
      error instanceof TranslationError
        ? error
        : normalizeFallbackError(error);

    throw combineTranslationErrors(geminiError, fallbackError);
  }
};
