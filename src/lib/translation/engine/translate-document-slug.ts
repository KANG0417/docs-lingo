import { isTextDocumentUrl } from "@/lib/document/text-document-url";
import { translateDocumentTitle } from "@/lib/translation/engine/translate-document-title";

const PATH_NOISE_SEGMENTS = new Set([
  "docs",
  "doc",
  "documentation",
  "en",
  "ko",
  "ja",
  "zh",
  "zh-cn",
  "zh-tw",
  "app",
  "pages",
  "learn",
  "blog",
  "articles",
  "reference",
  "api",
]);

const VERSION_SEGMENT_PATTERN = /^v\d+(\.\d+)*$/i;

export const extractDocumentSlugSegments = (rawUrl: string): string[] => {
  try {
    const { pathname } = new URL(rawUrl);
    const segments = pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .filter((segment) => !PATH_NOISE_SEGMENTS.has(segment.toLowerCase()))
      .filter((segment) => !VERSION_SEGMENT_PATTERN.test(segment))
      .filter((segment) => !/^\d+$/.test(segment));

    if (segments.length > 3) {
      return segments.slice(-3);
    }

    return segments;
  } catch {
    return [];
  }
};

const translateSlugSegment = (segment: string): string => {
  const phrase = segment.replace(/[-_]+/g, " ").trim();

  if (!phrase) {
    return segment;
  }

  return translateDocumentTitle(phrase);
};

export const translateDocumentSlugFromUrl = (
  url: string | null,
): string | null => {
  if (!url || isTextDocumentUrl(url)) {
    return null;
  }

  const segments = extractDocumentSlugSegments(url);

  if (segments.length === 0) {
    return null;
  }

  return segments.map(translateSlugSegment).join("/");
};

export const buildDocumentDisplayTitle = (
  url: string | null,
  fallbackTitle: string,
): string => {
  const slugTitle = translateDocumentSlugFromUrl(url);

  if (slugTitle) {
    return slugTitle;
  }

  return translateDocumentTitle(fallbackTitle);
};
