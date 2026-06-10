export type AiProvider = "gemini";

export interface UserAiSettings {
  provider: AiProvider;
  model: string;
  hasApiKey: boolean;
  maskedApiKey: string | null;
}

export interface UpdateUserAiSettingsPayload {
  provider: AiProvider;
  model: string;
  apiKey?: string;
  clearApiKey?: boolean;
}

export interface UserAiCredentials {
  provider: AiProvider;
  apiKey: string;
  model: string | null;
}
