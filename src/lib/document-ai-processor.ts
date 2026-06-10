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
import { normalizeSummaryTerms } from "@/lib/summary-terms-normalizer";
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

const normalizeTranslatedContent = (content: string): string => {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

번역 형식 규칙 (매우 중요):
- 입력의 [문단 N] 단위를 그대로 유지하세요.
- translatedContent에서 문단과 문단 사이는 반드시 빈 줄 1개(\\n\\n)로 구분하세요.
- 한 문단 안에서 원문 줄바꿈이 있으면 \\n 으로 표현하세요.
- 모든 문장을 한 줄로 이어 붙이지 마세요.

키워드 규칙:
- summaryTerms는 최대 8개, 같은 용어를 중복 등록하지 마세요.
- 핵심 용어 4개만 isCoreKeyword: true (본문에서 코드블록 강조)
- 나머지 용어는 isCoreKeyword: false (본문에서 밑줄 강조)
- term은 translatedContent에 실제 등장하는 표기와 정확히 일치해야 합니다.
- API명, 함수명, 라이브러리명, 프로토콜명 같은 기술 개념만 핵심 키워드로 선택하세요.
- API Reference, Documentation, Guide, Overview, Introduction, Changelog 같은 문서/내비게이션 용어는 핵심 키워드에서 제외하세요.
- description에는 용어 설명만 작성하세요. 용어명을 description 앞에 반복하지 마세요.
  (잘못된 예: "React: UI 라이브러리" / 올바른 예: "UI 라이브러리")`;
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
      translatedContent: normalizeTranslatedContent(response.translatedContent),
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
