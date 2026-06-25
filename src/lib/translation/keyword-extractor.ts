import { generateClaudeJson } from "@/lib/claude/claude-client";
import { KEYWORD_DESCRIPTION_RULES } from "@/lib/translation/prompt/keyword-description-rules";
import { TERMINOLOGY_MARKING_RULES } from "@/lib/translation/prompt/terminology-marking-rules";
import type { KeywordTerm } from "@/types/translation";

const MAX_SUMMARY_TERMS = 8;
const MAX_CORE_KEYWORDS = 4;
const MAX_PROMPT_CONTENT_LENGTH = 8000;

interface ClaudeKeywordResponse {
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

  return `당신은 20년 경력의 시니어 프론트엔드 개발자입니다.
번역 결과에서 핵심 용어를 골라, **문서 문장이 아닌 개념 설명**으로 정리하세요.

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
${KEYWORD_DESCRIPTION_RULES}
- **코드블럭 표기는 term(용어 이름)에만** 해당합니다. description에는 넣지 마세요.
- 가장 중요한 용어 ${MAX_CORE_KEYWORDS}개는 isCoreKeyword를 true로 설정 (백틱·코드 식별자 용어 우선)
- isCoreKeyword가 true인 term은 번역문에도 그대로 등장하는 원문 기술 용어(API명, 함수명, 설정명)로 작성
- 번역문에 백틱(\`...\`)으로 표시된 **공백 없는** 용어 → isCoreKeyword: true
- 번역문에 <u>...</u>로 표시된 **공백 있는** 개념어 → isCoreKeyword: false
- **App Router / Pages Router**처럼 같은 패턴 용어는 isCoreKeyword 값도 동일하게 맞추세요.
- term은 번역문 본문에 실제 등장하는 표기와 정확히 일치해야 합니다 (백틱·태그 제외)
- 목차·내비게이션 단어(Guides, Overview, API Reference, Getting Started 등)는 용어로 추출하지 않습니다.`;
};

const normalizeKeywordTerms = (
  summaryTerms: ClaudeKeywordResponse["summaryTerms"],
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

  const response = await generateClaudeJson<ClaudeKeywordResponse>(prompt);

  if (!response.summaryTerms?.length) {
    return [];
  }

  return normalizeKeywordTerms(response.summaryTerms);
};
