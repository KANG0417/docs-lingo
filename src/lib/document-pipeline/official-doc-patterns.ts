/**
 * 공식 기술 문서(Next.js, React, MDN, Read the Docs 등)에서 반복되는 구조 패턴.
 * 문단 분리·중요도 점수·AI 입력 정규화의 공통 기준으로 사용한다.
 */

/** ATX 마크다운 제목 (# ~ ###) */
export const MARKDOWN_ATX_HEADING_PATTERN = /^#{1,3}\s+(.+)$/;

/** HTML/Readability에서 추출된 앵커 연동 h1/h2 제목과 유사한 짧은 Title Case 줄 */
export const PLAIN_SECTION_HEADING_PATTERN =
  /^[A-Z][\w'()-]*(?:\s+[A-Za-z][\w'()-]*){0,8}$/;

/** 공식 문서 콜아웃 (Note / Warning / Tip 등) */
export const OFFICIAL_DOC_CALLOUT_LINE_PATTERN =
  /^(?:>\s*)?(?:\*\*)?(?:Note|Warning|Tip|Caution|Important|Deprecated|Info)(?:\*\*)?\s*:/i;

/** 한국어 문서 콜아웃 */
export const KOREAN_CALLOUT_LINE_PATTERN =
  /^(?:>\s*)?(?:참고|주의|팁|경고|중요|알림)\s*[:：]/;

/** 마크다운 불릿·번호 목록 */
export const MARKDOWN_LIST_ITEM_PATTERN = /^(?:[-*+]|\d+\.)\s+/;

/** 공식 문서에서 자주 보이는 UI·내비 노이즈 */
export const OFFICIAL_DOC_NAV_NOISE_PATTERNS: RegExp[] = [
  /edit this page/i,
  /last updated on/i,
  /on this page/i,
  /scroll to top/i,
  /was this page helpful/i,
  /previous\s*$/i,
  /next\s*$/i,
  /copy code/i,
  /give feedback/i,
];

export const isMarkdownAtxHeadingLine = (line: string): boolean => {
  return MARKDOWN_ATX_HEADING_PATTERN.test(line.trim());
};

export const isOfficialDocCalloutLine = (line: string): boolean => {
  const trimmed = line.trim();

  return (
    OFFICIAL_DOC_CALLOUT_LINE_PATTERN.test(trimmed) ||
    KOREAN_CALLOUT_LINE_PATTERN.test(trimmed)
  );
};

export const isOfficialDocNavNoise = (text: string): boolean => {
  return OFFICIAL_DOC_NAV_NOISE_PATTERNS.some((pattern) => pattern.test(text));
};

export const normalizeMarkdownHeadingToPlain = (line: string): string => {
  return line.replace(/^#{1,6}\s+/, "").trim();
};
