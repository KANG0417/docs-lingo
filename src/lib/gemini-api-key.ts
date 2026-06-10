const LEGACY_GEMINI_API_KEY_PREFIX = "AIza";
const NEW_GEMINI_API_KEY_PREFIX = "AQ.";
const MIN_LEGACY_GEMINI_API_KEY_LENGTH = 30;
const MIN_NEW_GEMINI_API_KEY_LENGTH = 20;

const isLegacyGeminiApiKey = (apiKey: string): boolean => {
  return (
    apiKey.startsWith(LEGACY_GEMINI_API_KEY_PREFIX) &&
    apiKey.length >= MIN_LEGACY_GEMINI_API_KEY_LENGTH
  );
};

const isNewGeminiApiKey = (apiKey: string): boolean => {
  return (
    apiKey.startsWith(NEW_GEMINI_API_KEY_PREFIX) &&
    apiKey.length >= MIN_NEW_GEMINI_API_KEY_LENGTH
  );
};

export const isValidGeminiApiKeyFormat = (apiKey: string): boolean => {
  const trimmedApiKey = apiKey.trim();

  return isLegacyGeminiApiKey(trimmedApiKey) || isNewGeminiApiKey(trimmedApiKey);
};

export const createInvalidGeminiApiKeyMessage = (hasUserApiKey: boolean): string => {
  if (hasUserApiKey) {
    return [
      "등록한 AI API 키 형식이 올바르지 않습니다.",
      "Google AI Studio(https://aistudio.google.com/apikey)에서 발급한",
      "'AIza' 또는 'AQ.'로 시작하는 키인지 확인해 주세요.",
    ].join("\n");
  }

  return [
    "서버 AI API 키 형식이 올바르지 않습니다.",
    "Google AI Studio(https://aistudio.google.com/apikey)에서 발급한",
    "'AIza' 또는 'AQ.'로 시작하는 키를 .env.local의 GEMINI_API_KEY에 설정하거나,",
    "개인정보 변경 메뉴의 AI 도구 설정에서 본인 키를 등록해 주세요.",
  ].join("\n");
};
