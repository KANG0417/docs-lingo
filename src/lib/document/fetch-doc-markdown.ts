import { DOCUMENT_FETCH_TIMEOUT_MS } from "@/constants/document-pipeline";
import { normalizeDocumentUrl } from "@/lib/document/normalize-document-url";

interface FetchedMarkdownDocument {
  url: string;
  markdown: string;
}

export const isNextJsDocUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "nextjs.org" && parsed.pathname.startsWith("/docs/")
    );
  } catch {
    return false;
  }
};

export const getMarkdownDocUrl = (url: string): string => {
  const normalized = normalizeDocumentUrl(url).replace(/\/$/, "");
  return `${normalized}.md`;
};

export const fetchDocMarkdown = async (
  url: string,
): Promise<FetchedMarkdownDocument | null> => {
  if (!isNextJsDocUrl(url)) {
    return null;
  }

  const markdownUrl = getMarkdownDocUrl(url);

  try {
    const response = await fetch(markdownUrl, {
      signal: AbortSignal.timeout(DOCUMENT_FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DocsLingoBot/1.0)",
      },
    });

    if (!response.ok) {
      return null;
    }

    const markdown = await response.text();

    if (!markdown.trim()) {
      return null;
    }

    return {
      url: markdownUrl,
      markdown,
    };
  } catch {
    return null;
  }
};
