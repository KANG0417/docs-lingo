import type { AiProvider } from "@/types/ai-settings";

interface AiProviderOption {
  id: AiProvider;
  label: string;
  apiKeyGuideUrl: string;
}

export const AI_PROVIDER_OPTIONS: AiProviderOption[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    apiKeyGuideUrl: "https://aistudio.google.com/apikey",
  },
];

export const DEFAULT_AI_PROVIDER: AiProvider = "gemini";

export const AUTO_AI_MODEL = "auto" as const;
