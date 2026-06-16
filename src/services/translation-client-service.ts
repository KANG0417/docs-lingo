import { HISTORY_PAGE_SIZE } from "@/constants/translation-history";
import type {
  DocumentTranslationResult,
  TranslationHistoryDateKeysResponse,
  TranslationHistoryItem,
  TranslationHistoryQuery,
  TranslationHistoryResponse,
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

export const getTranslationHistory = async (
  query: TranslationHistoryQuery = {},
): Promise<TranslationHistoryResponse> => {
  const searchParams = new URLSearchParams();

  if (query.dateKey) {
    searchParams.set("date", query.dateKey);
  }

  searchParams.set("page", String(query.page ?? 1));
  searchParams.set("pageSize", String(query.pageSize ?? HISTORY_PAGE_SIZE));

  const queryString = searchParams.toString();
  const endpoint = queryString
    ? `/api/translations/history?${queryString}`
    : "/api/translations/history";

  const response = await fetch(endpoint, { cache: "no-store" });

  if (!response.ok) {
    const { message } = (await response.json()) as { message: string };
    throw new Error(message);
  }

  return (await response.json()) as TranslationHistoryResponse;
};

export const getTranslationHistoryDateKeys =
  async (): Promise<TranslationHistoryDateKeysResponse> => {
    const response = await fetch("/api/translations/history/dates", {
      cache: "no-store",
    });

    if (!response.ok) {
      const { message } = (await response.json()) as { message: string };
      throw new Error(message);
    }

    return (await response.json()) as TranslationHistoryDateKeysResponse;
  };

export const getTranslationHistoryItem = async (
  translationId: string,
): Promise<TranslationHistoryItem> => {
  const response = await fetch(`/api/translations/history/${translationId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const { message } = (await response.json()) as { message: string };
    throw new Error(message);
  }

  return (await response.json()) as TranslationHistoryItem;
};

export const deleteTranslationHistoryItem = async (
  translationId: string,
): Promise<void> => {
  const response = await fetch(`/api/translations/history/${translationId}`, {
    method: "DELETE",
    cache: "no-store",
  });

  if (!response.ok) {
    const { message } = (await response.json()) as { message: string };
    throw new Error(message);
  }
};
