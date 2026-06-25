export const KNOWN_SUMMARY_SECTION_TITLES = [
  "한 줄 요약",
  "사전 조건",
  "문서 구조",
  "핵심 요약",
  "API·설정 요약",
  "핵심 용어",
  "코드 예제 설명",
  "주의할 점",
  "버전 정보",
] as const;

export type KnownSummarySectionTitle =
  (typeof KNOWN_SUMMARY_SECTION_TITLES)[number];

const SUMMARY_SECTION_TITLE_ALIASES: Record<KnownSummarySectionTitle, string[]> = {
  "한 줄 요약": [
    "한줄 요약",
    "한 문장 요약",
    "문서 목적",
    "요약",
    "purpose",
    "one line summary",
  ],
  "사전 조건": [
    "사전조건",
    "전제 조건",
    "prerequisites",
    "필수 조건",
  ],
  "문서 구조": [
    "문서구조",
    "구조",
    "문서 흐름",
    "작업 흐름",
    "workflow",
    "document structure",
  ],
  "핵심 요약": [
    "핵심요약",
    "핵심 개념",
    "핵심 내용",
    "core concepts",
    "summary",
  ],
  "API·설정 요약": [
    "API 요약",
    "API 설정 요약",
    "설정 요약",
    "apis",
    "api summary",
  ],
  "핵심 용어": [
    "핵심용어",
    "핵심 키워드",
    "핵심키워드",
    "key terms",
    "keywords",
  ],
  "코드 예제 설명": [
    "코드예제 설명",
    "코드 설명",
    "code examples",
    "code example",
  ],
  "주의할 점": [
    "주의 사항",
    "주의사항",
    "warnings",
    "cautions",
  ],
  "버전 정보": [
    "버전정보",
    "버전 노트",
    "version notes",
    "호환성",
  ],
};

const normalizeSummarySectionTitleCandidate = (line: string): string => {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\s*(?:\d+[.)]|[-*])\s+/, "")
    .replace(/^\*\*([\s\S]+)\*\*$/, "$1")
    .replace(/^`([\s\S]+)`$/, "$1")
    .replace(/<\/?u>/gi, "")
    .replace(/\s*[:：]\s*$/, "")
    .trim();
};

export const resolveKnownSummarySectionTitle = (
  line: string,
): KnownSummarySectionTitle | null => {
  const trimmed = normalizeSummarySectionTitleCandidate(line);
  const normalized = trimmed.toLocaleLowerCase("ko-KR").replace(/\s+/g, " ");

  for (const title of KNOWN_SUMMARY_SECTION_TITLES) {
    if (title === trimmed) {
      return title;
    }

    const aliases = SUMMARY_SECTION_TITLE_ALIASES[title];
    if (
      aliases.some(
        (alias) =>
          alias.toLocaleLowerCase("ko-KR").replace(/\s+/g, " ") === normalized,
      )
    ) {
      return title;
    }
  }

  return null;
};

export const isKnownSummarySectionTitle = (
  line: string,
): line is KnownSummarySectionTitle => {
  return resolveKnownSummarySectionTitle(line) !== null;
};

export const isSummaryOutputSectionTitle = (line: string): boolean => {
  return resolveKnownSummarySectionTitle(line) !== null;
};
