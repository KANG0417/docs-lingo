import type {
  DocumentTranslationResult,
  TranslationHistoryItem,
} from "@/types/translation";

const requestTranslation = async (
  payload: { url: string } | { text: string },
): Promise<DocumentTranslationResult> => {
  const response = await fetch("/api/documents/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const { message } = (await response.json()) as { message: string };
    throw new Error(message);
  }

  return (await response.json()) as DocumentTranslationResult;
};

export const translateDocumentFromUrl = async (
  url: string,
): Promise<DocumentTranslationResult> => {
  return requestTranslation({ url });
};

export const translateDocumentFromText = async (
  text: string,
): Promise<DocumentTranslationResult> => {
  return requestTranslation({ text });
};

export const getTranslationHistory = async (): Promise<TranslationHistoryItem[]> => {
  const response = await fetch("/api/translations/history");

  if (!response.ok) {
    const { message } = (await response.json()) as { message: string };
    throw new Error(message);
  }

  return (await response.json()) as TranslationHistoryItem[];
};
