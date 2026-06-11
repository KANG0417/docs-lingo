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
import { normalizeTranslatedLayout } from "@/lib/normalize-translated-layout";
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
  return normalizeTranslatedLayout(content);
};

const buildInterpretationPrompt = (documentContent: string): string => {
  return `아래 문서를 한국어로 번역하세요.

출력 형식:
- 원문의 제목/문단 구조를 그대로 유지합니다. "문단 1" 같은 라벨을 붙이지 마세요.
- 링크가 걸린 큰 제목(예: What is Next.js?, How to use the docs)을 기준으로 섹션을 나눕니다.
- 각 섹션은 "제목 한 줄 + 그 아래 본문" 형태로 유지합니다. 제목과 본문을 합치거나 섹션을 쪼개지 마세요.
- 섹션 내부의 줄바꿈·빈 줄·목록 구조는 원문과 동일하게 유지합니다.
- 인사말, 설명, 요약을 덧붙이지 마세요. 번역된 문서만 출력합니다.

용어 표기 규칙:

1. 제목·섹션명·메뉴명 (Getting Started, API Reference, How to use these docs 등)
   → 자연스러운 한국어로 번역만 합니다. 밑줄·백틱 등 아무 표시도 하지 않습니다.
   - 예: "Getting Started" → "시작하기", "How to use these docs" → "문서 사용 방법"

2. 본문 문장 안에 나오는 두 단어 이상의 기술 개념어
   → 밑줄 <u></u>
   - 예: <u>App Router</u>, <u>Server Component</u>

3. 인라인 코드(백틱):
   a. 한 단어짜리 기술/언어 이름: \`React\`, \`HTML\`, \`CSS\`
   b. 코드에 실제 입력되는 것: \`next.config.js\`, \`useRouter\`, \`npm run dev\`

4. 영문 고유명사 + 한글 혼용 표기는 영문 기술 용어로 통일합니다.
   - 잘못된 예: "React 컴포넌트", "Next.js 프레임워크", "서버 컴포넌트"
   - 올바른 예: "React Components", "Next.js framework", "Server Components"
   - 본문에서 기술 개념은 가능한 한 영문 표기를 유지하고, 한글 번역과 섞지 마세요.

5. 그 외 일반 단어에는 아무 표시도 추가하지 않습니다.

<document>
${documentContent}
</document>

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

translatedContent 추가 규칙:
- 위 출력 형식·용어 표기 규칙을 그대로 적용한 결과만 넣으세요.
- 본문에 <u> 또는 백틱으로 표시한 용어는 translatedContent에 반드시 포함하세요.

키워드 규칙 (summaryTerms):
- summaryTerms는 최대 8개, 같은 용어를 중복 등록하지 마세요.
- translatedContent에 <u>로 표시한 용어는 isCoreKeyword: false로 등록하세요. (term에는 태그 없이 용어만)
- translatedContent에 백틱으로 표시한 용어는 isCoreKeyword: true로 등록하세요. (term에는 백틱 없이 용어만)
- 제목·섹션명·메뉴명(시작하기, 문서 사용 방법 등)은 summaryTerms에 넣지 마세요.
- term은 translatedContent 본문에 실제 등장하는 표기와 정확히 일치해야 합니다.
- API Reference, Documentation, Guide, Overview, Introduction, Changelog 같은 내비게이션 용어는 제외하세요.
- description에는 용어 설명만 한국어로 작성하세요. 용어명을 description 앞에 반복하지 마세요.
  (잘못된 예: "React: UI 라이브러리" / 올바른 예: "UI 라이브러리")
- 설정 파일·표준 명칭은 역할을 함께 설명하세요.
  (예: package.json → "프로젝트 의존성, 실행 스크립트, 메타데이터를 정의하는 npm 패키지 설정 파일")
  (예: next.config.js → "Next.js 빌드·런타임 동작을 설정하는 구성 파일")`;
};

const processWithGemini = async (
  originalContent: string,
  userCredentials?: UserAiCredentials | null,
): Promise<ProcessedDocument> => {
  const limitedInput = originalContent.slice(0, MAX_AI_INPUT_LENGTH);
  const prompt = buildInterpretationPrompt(limitedInput);

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
      return await processWithGemini(trimmedContent, userCredentials);
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
