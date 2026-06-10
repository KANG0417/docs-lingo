import { generateGeminiJson } from "@/lib/gemini-client";
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

  return `당신은 기술 문서 분석 전문가입니다.
아래 문서를 분석해 핵심 용어와 설명을 추출해주세요.

문서 제목: ${title}

[원문]
${originalSnippet}

[한국어 번역]
${translatedSnippet}

다음 JSON 형식으로만 응답하세요:
{
  "summaryTerms": [
    {
      "term": "용어이름",
      "description": "용어설명",
      "isCoreKeyword": true
    }
  ]
}

규칙:
- summaryTerms는 최대 ${MAX_SUMMARY_TERMS}개
- description은 한국어로 1~2문장
- 가장 중요한 용어 ${MAX_CORE_KEYWORDS}개는 isCoreKeyword를 true로 설정
- isCoreKeyword가 true인 term은 번역문에서도 그대로 등장하는 원문 기술 용어(API명, 함수명 등)로 작성
- 형식은 "용어이름: 용어설명"에 맞게 작성`;
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
