import type {
  DocumentTranslationResult,
  TranslationHistoryItem,
} from "@/types/translation";

export const translateDocumentFromUrl = async (
  url: string,
): Promise<DocumentTranslationResult> => {
  const response = await fetch("/api/documents/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const { message } = (await response.json()) as { message: string };
    throw new Error(message);
  }

  return (await response.json()) as DocumentTranslationResult;
};

export const getTranslationHistory = async (): Promise<TranslationHistoryItem[]> => {
  const response = await fetch("/api/translations/history");

  if (!response.ok) {
    const { message } = (await response.json()) as { message: string };
    throw new Error(message);
  }

  return (await response.json()) as TranslationHistoryItem[];
};
