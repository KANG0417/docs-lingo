import { DOCUMENT_FETCH_TIMEOUT_MS } from "@/constants/document-pipeline";
import { normalizeDocumentUrl } from "@/lib/document/normalize-document-url";
import { TranslationError } from "@/lib/translation/translation-errors";

interface FetchedHtmlDocument {
  url: string;
  html: string;
}

export const fetchHtmlDocument = async (url: string): Promise<FetchedHtmlDocument> => {
  try {
    const targetUrl = new URL(url);

    const response = await fetch(targetUrl, {
      signal: AbortSignal.timeout(DOCUMENT_FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DocsLingoBot/1.0)",
      },
    });

    if (!response.ok) {
      throw new TranslationError(
        "DOCUMENT_FETCH_FAILED",
        `문서를 가져오지 못했습니다. (HTTP ${response.status}) 주소를 확인해 주세요.`,
        `HTTP ${response.status}`,
      );
    }

    const html = await response.text();

    return {
      url: normalizeDocumentUrl(targetUrl.href),
      html,
    };
  } catch (error) {
    if (error instanceof TranslationError) {
      throw error;
    }

    throw new TranslationError(
      "DOCUMENT_FETCH_FAILED",
      "문서를 읽는 중 오류가 발생했습니다. URL이 올바른지 확인해 주세요.",
      error instanceof Error ? error.message : "fetch failed",
    );
  }
};
