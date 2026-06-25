import { normalizeDocumentUrl } from "@/lib/document/normalize-document-url";
import { fetchOfficialDocMarkdown } from "@/lib/document/fetch-official-doc-markdown";

export const isNextJsDocUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "nextjs.org" &&
      (parsed.pathname === "/docs" || parsed.pathname.startsWith("/docs/"))
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
  pageUrl: string,
): Promise<{ url: string; markdown: string } | null> => {
  const result = await fetchOfficialDocMarkdown(pageUrl);

  if (!result) {
    return null;
  }

  return {
    url: result.url,
    markdown: result.markdown,
  };
};
