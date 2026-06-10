export type AiProvider = "gemini";

export interface UserAiSettings {
  provider: AiProvider;
  model: "auto";
  hasApiKey: boolean;
  maskedApiKey: string | null;
}

export interface UpdateUserAiSettingsPayload {
  provider: AiProvider;
  apiKey?: string;
  clearApiKey?: boolean;
}

export interface UserAiCredentials {
  provider: AiProvider;
  apiKey: string;
}
