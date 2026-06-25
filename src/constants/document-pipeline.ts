export const DOCUMENT_FETCH_TIMEOUT_MS = 15000;

export const MIN_PARAGRAPH_LENGTH = 24;

/** 인사·강조 한 줄 (예: "Welcome to the Next.js documentation!") */
export const INTRO_LINE_MAX_LENGTH = 120;

/** 질문형 소제목 한 줄 (예: "What is Next.js?") */
export const QUESTION_HEADING_MAX_LENGTH = 100;

export const QUESTION_HEADING_MAX_WORDS = 12;

/** 본문 문장 한 줄 최소 길이 */
export const BODY_SENTENCE_MIN_LENGTH = 24;

/** AI에 넘기는 최대 문단 수 */
export const MAX_PARAGRAPHS_FOR_AI = 40;

/** 전체 번역 AI 입력 상한 (문단 텍스트 합) */
export const MAX_AI_INPUT_LENGTH = 10000;

/** 핵심요약 프롬프트용 입력 상한 */
export const MAX_SUMMARY_AI_INPUT_LENGTH = 8000;

export const MAX_SUMMARY_PARAGRAPHS = 25;

/** 섹션 단위 청크 번역 시 청크당 상한 */
export const MAX_FULL_CHUNK_INPUT_LENGTH = 9000;

/** 이 길이를 넘으면 전체 번역을 섹션 청크로 분할 */
export const CHUNK_TRANSLATION_THRESHOLD = 10000;

/** 중요도 필터 활성화 — 노이즈 제거 후 상한 적용 */
export const ENABLE_IMPORTANCE_FILTER = true;

/** 이 점수 이하 문단은 AI 입력에서 제외 (노이즈·내비 등) */
export const IMPORTANCE_SCORE_THRESHOLD = 0.5;

export type DocumentExtractionSource = "markdown" | "readability";
