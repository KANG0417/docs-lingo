import { isTextDocumentUrl } from "@/lib/document/text-document-url";

/**
 * #fragment는 같은 페이지 내 앵커이므로 무시하고, origin + pathname + 정렬된 쿼리만 사용해
 * 실제 페이지 단위의 고유 키를 반환한다.
 */
export const getPageKey = (rawUrl: string): string | null => {
  try {
    const { origin, pathname, searchParams } = new URL(rawUrl);
    const sortedQuery = [...searchParams.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return sortedQuery ? `${origin}${pathname}?${sortedQuery}` : `${origin}${pathname}`;
  } catch {
    return null;
  }
};

/**
 * 저장·비교용 canonical URL. hash(#...)는 제거하고 쿼리스트링은 유지한다.
 */
export const normalizeDocumentUrl = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = "";
    return parsed.href;
  } catch {
    return rawUrl.trim();
  }
};

/**
 * DB에서 동일 페이지 후보 URL을 like 검색할 때 사용하는 origin + pathname 접두사.
 */
export const getDocumentUrlLookupPrefix = (rawUrl: string): string | null => {
  try {
    const { origin, pathname } = new URL(rawUrl);
    return `${origin}${pathname}`;
  } catch {
    return null;
  }
};

export const isSamePage = (urlA: string, urlB: string): boolean => {
  const keyA = getPageKey(urlA);
  const keyB = getPageKey(urlB);
  return keyA !== null && keyA === keyB;
};

export const deduplicatePageUrls = (urls: string[]): string[] => {
  const seen = new Set<string>();
  return urls.filter((url) => {
    const key = getPageKey(url);
    if (key === null || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

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
  if (!rawUrl || isTextDocumentUrl(rawUrl)) {
    return "직접 입력";
  }

  try {
    const parsedUrl = new URL(rawUrl);
    return parsedUrl.hostname.replace(/^www\./, "");
  } catch {
    return "알 수 없는 사이트";
  }
};
