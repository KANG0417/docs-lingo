export const CLAUDE_MODEL_POLICY = {
  /** Sonnet 4.6 — 번역·요약 워크로드에 비용 대비 품질이 가장 적합 */
  model: "claude-sonnet-4-6",
  temperature: 0.15,
  maxOutputTokens: 8192,
} as const;

export const CLAUDE_MODEL = CLAUDE_MODEL_POLICY.model;

export const CLAUDE_TEMPERATURE = CLAUDE_MODEL_POLICY.temperature;

export const CLAUDE_MAX_OUTPUT_TOKENS = CLAUDE_MODEL_POLICY.maxOutputTokens;

/**
 * 완전 번역은 압축된 JSON 요약과 달리 원문 분량만큼 한국어 텍스트를 그대로
 * 출력해야 한다. Sonnet 4.6은 스트리밍 시 출력 토큰 64K까지 지원하므로
 * 여유 있게 잡는다(스트리밍을 항상 사용해 타임아웃 위험은 없다).
 */
export const CLAUDE_FULL_TRANSLATION_MAX_OUTPUT_TOKENS = 32000;
