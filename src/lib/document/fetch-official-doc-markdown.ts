import { DOCUMENT_FETCH_TIMEOUT_MS } from "@/constants/document-pipeline";
import { normalizeDocumentUrl } from "@/lib/document/normalize-document-url";
import {
  getMarkdownDocUrl,
  isNextJsDocUrl,
} from "@/lib/document/fetch-doc-markdown";

export interface FetchedOfficialMarkdown {
  url: string;
  markdown: string;
  sourcePageUrl: string;
}

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (compatible; DocsLingo/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const hasPathExtension = (pathname: string): boolean => {
  return /\.[a-z0-9]{2,5}$/i.test(pathname.replace(/\/$/, ""));
};

/**
 * 공식 문서 URL에서 시도할 마크다운 후보 URL 목록.
 * Next.js `.md` 미러, `/docs/` 경로 `.md` suffix 등을 표준으로 삼는다.
 */
export const resolveMarkdownCandidateUrls = (pageUrl: string): string[] => {
  const candidates: string[] = [];

  if (isNextJsDocUrl(pageUrl)) {
    candidates.push(getMarkdownDocUrl(pageUrl));
  }

  try {
    const parsed = new URL(normalizeDocumentUrl(pageUrl));
    const pathname = parsed.pathname.replace(/\/$/, "");

    if (
      /\/docs?(?:\/|$)/i.test(pathname) &&
      !hasPathExtension(pathname) &&
      !pathname.endsWith(".md")
    ) {
      candidates.push(`${parsed.origin}${pathname}.md`);
    }

    if (
      /\/guide(?:\/|$)/i.test(pathname) &&
      !hasPathExtension(pathname)
    ) {
      candidates.push(`${parsed.origin}${pathname}.md`);
    }
  } catch {
    return [...new Set(candidates)];
  }

  return [...new Set(candidates)];
};

const fetchMarkdownUrl = async (
  markdownUrl: string,
): Promise<string | null> => {
  try {
    const response = await fetch(markdownUrl, {
      signal: AbortSignal.timeout(DOCUMENT_FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept: "text/markdown, text/plain, */*",
      },
    });

    if (!response.ok) {
      return null;
    }

    const markdown = await response.text();

    if (!markdown.trim() || markdown.trim().length < 80) {
      return null;
    }

    if (!/(^|\n)#+\s|(^|\n)[-*]\s|(^|\n)\d+\.\s/m.test(markdown)) {
      return null;
    }

    return markdown;
  } catch {
    return null;
  }
};

export const extractMarkdownTitle = (markdown: string): string | null => {
  const withoutFrontmatter = markdown.replace(/^\uFEFF?---[\s\S]*?---\s*\n?/, "");
  const headingMatch = withoutFrontmatter.match(/^#\s+(.+)$/m);

  return headingMatch?.[1]?.trim() ?? null;
};

export const fetchOfficialDocMarkdown = async (
  pageUrl: string,
): Promise<FetchedOfficialMarkdown | null> => {
  const candidateUrls = resolveMarkdownCandidateUrls(pageUrl);

  for (const markdownUrl of candidateUrls) {
    const markdown = await fetchMarkdownUrl(markdownUrl);

    if (markdown) {
      return {
        url: markdownUrl,
        markdown,
        sourcePageUrl: normalizeDocumentUrl(pageUrl),
      };
    }
  }

  return null;
};
