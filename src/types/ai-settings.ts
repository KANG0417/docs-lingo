export type AiProvider = "claude";

export interface UserAiCredentials {
  provider: AiProvider;
  apiKey: string;
}
