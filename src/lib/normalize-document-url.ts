const PAGINATION_QUERY_KEYS = new Set([
  "page",
  "p",
  "pg",
  "pagenum",
  "page_num",
  "page-number",
  "offset",
  "start",
  "skip",
  "cursor",
  "after",
  "before",
  "from",
]);

const PAGINATION_PATH_PATTERN = /\/(?:page|p|pg)[/-]?\d+\/?$/i;

export const isPaginationDocumentUrl = (rawUrl: string): boolean => {
  try {
    const parsedUrl = new URL(rawUrl);

    for (const [key] of parsedUrl.searchParams.entries()) {
      if (PAGINATION_QUERY_KEYS.has(key.toLowerCase())) {
        return true;
      }
    }

    if (PAGINATION_PATH_PATTERN.test(parsedUrl.pathname)) {
      return true;
    }

    const hashValue = parsedUrl.hash.replace(/^#/, "").toLowerCase();
    if (/^(page|p)=?\d+$/.test(hashValue)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

export const getSiteLabelFromUrl = (rawUrl: string | null): string => {
  if (!rawUrl) {
    return "텍스트 문서";
  }

  try {
    const parsedUrl = new URL(rawUrl);
    return parsedUrl.hostname.replace(/^www\./, "");
  } catch {
    return "알 수 없는 사이트";
  }
};
