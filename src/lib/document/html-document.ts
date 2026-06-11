import { parseHTML } from "linkedom";

export const createDocumentFromHtml = (html: string, url: string): Document => {
  const htmlWithBase = html.includes("<head")
    ? html.replace("<head>", `<head><base href="${url}">`)
    : `<html><head><base href="${url}"></head><body>${html}</body></html>`;

  const { document } = parseHTML(htmlWithBase);
  return document as unknown as Document;
};

export const getDocumentContentRoot = (document: Document): Element => {
  return (
    document.querySelector("article") ??
    document.querySelector("main") ??
    document.body
  );
};
