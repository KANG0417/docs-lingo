import type {
  DocumentTranslationResult,
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

  if (query.page) {
    searchParams.set("page", String(query.page));
  }

  if (query.pageSize) {
    searchParams.set("pageSize", String(query.pageSize));
  }

  const queryString = searchParams.toString();
  const endpoint = queryString
    ? `/api/translations/history?${queryString}`
    : "/api/translations/history";

  const response = await fetch(endpoint);

  if (!response.ok) {
    const { message } = (await response.json()) as { message: string };
    throw new Error(message);
  }

  return (await response.json()) as TranslationHistoryResponse;
};
