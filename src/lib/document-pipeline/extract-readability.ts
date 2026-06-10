import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { extractTitle } from "@/lib/extract-html-document";

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

const createDocumentFromHtml = (html: string, url: string): Document => {
  const htmlWithBase = html.includes("<head")
    ? html.replace("<head>", `<head><base href="${url}">`)
    : `<html><head><base href="${url}"></head><body>${html}</body></html>`;

  const { document } = parseHTML(htmlWithBase);
  return document as unknown as Document;
};

export const extractWithReadability = (
  html: string,
  url: string,
): ReadabilityExtractionResult => {
  const document = createDocumentFromHtml(html, url);
  const reader = new Readability(document);
  const article = reader.parse();

  const title = article?.title?.trim() || extractTitle(html);
  const textContent = normalizeWhitespace(article?.textContent ?? "");

  return {
    title,
    textContent,
  };
};
