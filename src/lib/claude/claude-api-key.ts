const CLAUDE_API_KEY_PREFIX = "sk-ant-";
const MIN_CLAUDE_API_KEY_LENGTH = 20;

export const isValidClaudeApiKeyFormat = (apiKey: string): boolean => {
  const trimmedApiKey = apiKey.trim();

  return (
    trimmedApiKey.startsWith(CLAUDE_API_KEY_PREFIX) &&
    trimmedApiKey.length >= MIN_CLAUDE_API_KEY_LENGTH
  );
};

export const createInvalidClaudeApiKeyMessage = (hasUserApiKey: boolean): string => {
  if (hasUserApiKey) {
    return [
      "등록한 AI API 키 형식이 올바르지 않습니다.",
      "Anthropic Console(https://console.anthropic.com/settings/keys)에서 발급한",
      "'sk-ant-'로 시작하는 키인지 확인해 주세요.",
    ].join("\n");
  }

  return [
    "서버 AI API 키 형식이 올바르지 않습니다.",
    "Anthropic Console(https://console.anthropic.com/settings/keys)에서 발급한",
    "'sk-ant-'로 시작하는 키를 .env.local의 ANTHROPIC_API_KEY에 설정해 주세요.",
  ].join("\n");
};
