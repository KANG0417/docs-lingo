import type { AiProvider } from "@/types/ai-settings";

interface AiProviderOption {
  id: AiProvider;
  label: string;
  apiKeyGuideUrl: string;
  modelPlaceholder: string;
  modelSuggestions: string[];
}

export const AI_PROVIDER_OPTIONS: AiProviderOption[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    apiKeyGuideUrl: "https://aistudio.google.com/apikey",
    modelPlaceholder: "gemini-2.0-flash-lite",
    modelSuggestions: [
      "gemini-2.0-flash-lite",
      "gemini-1.5-flash",
      "gemini-2.0-flash",
    ],
  },
];

export const DEFAULT_AI_PROVIDER: AiProvider = "gemini";

export const DEFAULT_AI_MODEL = "gemini-2.0-flash-lite";
