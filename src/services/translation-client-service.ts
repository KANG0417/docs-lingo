import { HISTORY_PAGE_SIZE } from "@/constants/translation-history";
import type { TranslationErrorCode } from "@/lib/translation/translation-errors";
import type {
  DocumentTranslationResult,
  TranslationHistoryDateKeysResponse,
  TranslationHistoryItem,
  TranslationHistoryQuery,
  TranslationHistoryResponse,
} from "@/types/translation";

interface ApiErrorResponse {
  message?: string;
  code?: TranslationErrorCode;
}

export class TranslationRequestError extends Error {
  public readonly code?: TranslationErrorCode;
  public readonly status: number;

  constructor(message: string, status: number, code?: TranslationErrorCode) {
    super(message);
    this.name = "TranslationRequestError";
    this.status = status;
    this.code = code;
  }
}

const parseErrorResponse = async (response: Response): Promise<ApiErrorResponse> => {
  try {
    return (await response.json()) as ApiErrorResponse;
  } catch {
    return {};
  }
};

const requestTranslation = async (
  payload: { url: string } | { text: string },
): Promise<DocumentTranslationResult> => {
  const response = await fetch("/api/documents/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const { message, code } = await parseErrorResponse(response);
    throw new TranslationRequestError(
      message ?? `번역 요청에 실패했습니다. (HTTP ${response.status})`,
      response.status,
      code,
    );
  }

  return (await response.json()) as DocumentTranslationResult;
};

export const translateDocumentFromUrl = async (
  url: string,
): Promise<DocumentTranslationResult> => {
  return requestTranslation({ url });
};

export const fetchFullTranslation = async (
  translationId: string,
  originalContent?: string,
): Promise<{ translatedFullContent: string }> => {
  const response = await fetch("/api/documents/translate/full", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ translationId, originalContent }),
  });

  if (!response.ok) {
    const { message } = await parseErrorResponse(response);
    throw new TranslationRequestError(
      message ?? `전체 번역 요청에 실패했습니다. (HTTP ${response.status})`,
      response.status,
    );
  }

  return (await response.json()) as { translatedFullContent: string };
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
