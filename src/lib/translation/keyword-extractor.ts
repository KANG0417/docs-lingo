import { generateGeminiJson } from "@/lib/gemini/gemini-client";
import { TERMINOLOGY_MARKING_RULES } from "@/lib/translation/terminology-marking-rules";
import type { KeywordTerm } from "@/types/translation";

const MAX_SUMMARY_TERMS = 8;
const MAX_CORE_KEYWORDS = 4;
const MAX_PROMPT_CONTENT_LENGTH = 8000;

interface GeminiKeywordResponse {
  summaryTerms: Array<{
    term: string;
    description: string;
    isCoreKeyword?: boolean;
  }>;
}

const buildKeywordPrompt = (
  originalContent: string,
  translatedContent: string,
  title: string,
): string => {
  const originalSnippet = originalContent.slice(0, MAX_PROMPT_CONTENT_LENGTH);
  const translatedSnippet = translatedContent.slice(0, MAX_PROMPT_CONTENT_LENGTH);

  return `당신은 20년 경력의 시니어 개발자입니다.
주니어가 번역 결과만 보고도 현업 맥락을 이해하도록, **실무에서 쓰는 핵심 용어**만 추출하세요.

문서 제목: ${title}

[원문]
${originalSnippet}

[한국어 번역]
${translatedSnippet}

${TERMINOLOGY_MARKING_RULES}

다음 JSON 형식으로만 응답하세요. JSON 외의 텍스트는 출력하지 마세요:
{
  "summaryTerms": [
    {
      "term": "용어이름",
      "description": "용어 설명",
      "isCoreKeyword": true
    }
  ]
}

규칙:
- summaryTerms는 최대 ${MAX_SUMMARY_TERMS}개, 같은 용어를 중복 등록하지 마세요.
- description은 한국어 1~2문장으로 용어 설명만 작성합니다. 용어명을 description 앞에 반복하지 마세요.
- 가장 중요한 용어 ${MAX_CORE_KEYWORDS}개는 isCoreKeyword를 true로 설정 (백틱·코드 식별자 용어 우선)
- isCoreKeyword가 true인 term은 번역문에도 그대로 등장하는 원문 기술 용어(API명, 함수명, 설정명)로 작성
- 번역문에 백틱(\`...\`)으로 표시된 용어는 isCoreKeyword: true, <u>...</u>로 표시된 용어는 isCoreKeyword: false
- term은 번역문 본문에 실제 등장하는 표기와 정확히 일치해야 합니다 (백틱·태그 제외)
- 목차·내비게이션 단어(Guides, Overview, API Reference, Getting Started 등)는 용어로 추출하지 않습니다.
- 설정 파일·표준 명칭은 역할을 함께 설명하세요.`;
};

const normalizeKeywordTerms = (
  summaryTerms: GeminiKeywordResponse["summaryTerms"],
): KeywordTerm[] => {
  const uniqueTerms = new Map<string, KeywordTerm>();

  summaryTerms.forEach((item) => {
    const term = item.term.trim();
    const description = item.description.trim();

    if (!term || !description) return;

    const normalizedKey = term.toLowerCase();
    if (uniqueTerms.has(normalizedKey)) return;

    uniqueTerms.set(normalizedKey, {
      term,
      description,
      isCoreKeyword: Boolean(item.isCoreKeyword),
    });
  });

  const sortedTerms = [...uniqueTerms.values()].slice(0, MAX_SUMMARY_TERMS);
  const coreKeywordCount = sortedTerms.filter(
    (item) => item.isCoreKeyword,
  ).length;

  return sortedTerms.map((item, index) => ({
    ...item,
    isCoreKeyword:
      item.isCoreKeyword ||
      (coreKeywordCount < MAX_CORE_KEYWORDS && index < MAX_CORE_KEYWORDS),
  }));
};

export const extractKeywordTerms = async (
  originalContent: string,
  translatedContent: string,
  title: string,
): Promise<KeywordTerm[]> => {
  const prompt = buildKeywordPrompt(
    originalContent,
    translatedContent,
    title,
  );

  const response = await generateGeminiJson<GeminiKeywordResponse>(prompt);

  if (!response.summaryTerms?.length) {
    return [];
  }

  return normalizeKeywordTerms(response.summaryTerms);
};
