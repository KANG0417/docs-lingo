import { Readability } from "@mozilla/readability";
import { createDocumentFromHtml } from "@/lib/document/html-document";
import { extractTitle } from "@/lib/document/extract-html-document";

interface ReadabilityExtractionResult {
  title: string;
  textContent: string;
}

const normalizeWhitespace = (text: string): string => {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
};

const createReadableDocument = (html: string, url: string): Document => {
  return createDocumentFromHtml(html, url);
};

export const extractWithReadability = (
  html: string,
  url: string,
): ReadabilityExtractionResult => {
  const document = createReadableDocument(html, url);
  const reader = new Readability(document);
  const article = reader.parse();

  const title = article?.title?.trim() || extractTitle(html);
  const textContent = normalizeWhitespace(article?.textContent ?? "");

  return {
    title,
    textContent,
  };
};
