export type AiProvider = "gemini";

export interface UserAiCredentials {
  provider: AiProvider;
  apiKey: string;
}
