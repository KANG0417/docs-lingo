import { createHash } from "node:crypto";
import {
  buildPinnedGeminiModelCandidates,
  buildStaticGeminiModelFallback,
  GEMINI_MODEL_POLICY,
  GEMINI_PREFERRED_MODELS,
} from "@/constants/gemini";

interface GeminiModelListResponse {
  models?: Array<{
    name: string;
    supportedGenerationMethods?: string[];
  }>;
}

interface ModelCacheEntry {
  models: string[];
  expiresAt: number;
}

const modelCache = new Map<string, ModelCacheEntry>();

const getApiKeyCacheKey = (apiKey: string): string => {
  return createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
};

const extractModelId = (modelName: string): string => {
  return modelName.replace(/^models\//, "");
};

const isDeprecatedModel = (modelId: string): boolean => {
  const loweredModelId = modelId.toLowerCase();

  return (
    loweredModelId.includes("gemini-2.0") ||
    loweredModelId.includes("gemini-1.5") ||
    loweredModelId.includes("gemini-1.0")
  );
};

const isTranslationCandidate = (modelId: string): boolean => {
  const loweredModelId = modelId.toLowerCase();

  return (
    !loweredModelId.includes("embedding") &&
    !loweredModelId.includes("image") &&
    !loweredModelId.includes("live") &&
    !loweredModelId.includes("tts") &&
    !loweredModelId.includes("aqa")
  );
};

const scoreModel = (modelId: string): number => {
  if (isDeprecatedModel(modelId)) {
    return -1000;
  }

  const priorityIndex = GEMINI_PREFERRED_MODELS.indexOf(
    modelId as (typeof GEMINI_PREFERRED_MODELS)[number],
  );

  if (priorityIndex >= 0) {
    return 1000 - priorityIndex;
  }

  const loweredModelId = modelId.toLowerCase();

  if (loweredModelId.includes("flash-lite")) {
    return 500;
  }

  if (loweredModelId.includes("flash")) {
    return 400;
  }

  if (loweredModelId.includes("pro")) {
    return 200;
  }

  return 0;
};

const sortModels = (modelIds: string[]): string[] => {
  return [...new Set(modelIds)].sort(
    (left, right) => scoreModel(right) - scoreModel(left),
  );
};

const getCachedModels = (cacheKey: string): string[] | null => {
  const cachedEntry = modelCache.get(cacheKey);

  if (!cachedEntry) {
    return null;
  }

  if (cachedEntry.expiresAt <= Date.now()) {
    modelCache.delete(cacheKey);
    return null;
  }

  return cachedEntry.models;
};

const setCachedModels = (cacheKey: string, models: string[]): void => {
  modelCache.set(cacheKey, {
    models,
    expiresAt: Date.now() + GEMINI_MODEL_POLICY.modelCacheTtlMs,
  });
};

const fetchAvailableModels = async (apiKey: string): Promise<string[]> => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
  );

  const data = (await response.json()) as GeminiModelListResponse;

  if (!response.ok || !data.models?.length) {
    return [];
  }

  return sortModels(
    data.models
      .filter((model) =>
        model.supportedGenerationMethods?.includes("generateContent"),
      )
      .map((model) => extractModelId(model.name))
      .filter(isTranslationCandidate)
      .filter((modelId) => !isDeprecatedModel(modelId)),
  );
};

export const resolveAutoGeminiModels = async (apiKey: string): Promise<string[]> => {
  const cacheKey = getApiKeyCacheKey(apiKey);
  const pinnedModels = buildPinnedGeminiModelCandidates();

  if (pinnedModels.length > 0) {
    setCachedModels(cacheKey, pinnedModels);
    return pinnedModels;
  }

  const cachedModels = getCachedModels(cacheKey);

  if (cachedModels?.length) {
    return cachedModels;
  }

  try {
    const discoveredModels = await fetchAvailableModels(apiKey);

    if (discoveredModels.length > 0) {
      setCachedModels(cacheKey, discoveredModels);
      return discoveredModels;
    }
  } catch (error) {
    console.error(
      "[resolveAutoGeminiModels]",
      error instanceof Error ? error.message : "model list fetch failed",
    );
  }

  const fallbackModels = buildStaticGeminiModelFallback();
  setCachedModels(cacheKey, fallbackModels);
  return fallbackModels;
};
