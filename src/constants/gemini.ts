/** 정상 번역에 우선 사용할 모델 (listModels 정렬·fallback 기준) */
export const GEMINI_PREFERRED_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
] as const;

/** primary 모델 404/deprecated 시에만 시도 */
export const GEMINI_FAILOVER_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
] as const;

export const GEMINI_MODEL_POLICY = {
  temperature: 0.2,
  maxRetryCount: 2,
  modelCacheTtlMs: 60 * 60 * 1000,
} as const;

export const GEMINI_MAX_RETRY_COUNT = GEMINI_MODEL_POLICY.maxRetryCount;

export const GEMINI_TEMPERATURE = GEMINI_MODEL_POLICY.temperature;

/** .env.local GEMINI_MODEL — 설정 시 listModels 없이 이 모델만 사용 (품질 고정) */
export const getPinnedGeminiModel = (): string | null => {
  const pinnedModel = process.env.GEMINI_MODEL?.trim();
  return pinnedModel || null;
};

export const buildPinnedGeminiModelCandidates = (): string[] => {
  const pinnedModel = getPinnedGeminiModel();

  if (!pinnedModel) {
    return [];
  }

  const failoverModels = GEMINI_FAILOVER_MODELS.filter(
    (model) => model !== pinnedModel,
  );

  return [pinnedModel, ...failoverModels];
};

export const buildStaticGeminiModelFallback = (): string[] => {
  const preferredModels = [...GEMINI_PREFERRED_MODELS];
  const failoverModels = GEMINI_FAILOVER_MODELS.filter(
    (model) => !preferredModels.includes(model),
  );

  return [...preferredModels, ...failoverModels];
};
