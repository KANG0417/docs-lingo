import { createDocumentFromHtml, getDocumentContentRoot } from "@/lib/document/html-document";
import type {
  ClaudeGlossaryTerm,
  PreservedCodeBlock,
  StructuredExtractionResult,
} from "@/types/claude-document-translation";

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

const NOISE_SELECTORS = [
  "nav",
  "header",
  "footer",
  "aside",
  "script",
  "style",
  "noscript",
  "iframe",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
  "[aria-hidden='true']",
  ".sidebar",
  ".nav",
  ".navbar",
  ".toc",
  ".table-of-contents",
  ".breadcrumb",
  ".breadcrumbs",
  ".footer",
  ".header",
  ".advertisement",
  ".ad",
  ".cookie",
  ".newsletter",
  ".comment",
  ".comments",
  ".related-posts",
  ".social-share",
].join(", ");

const INLINE_CODE_PARENT_TAGS = new Set([
  "P",
  "LI",
  "TD",
  "TH",
  "BLOCKQUOTE",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "DT",
  "DD",
]);

const GLOSSARY_CANDIDATE_PATTERN =
  /\b([A-Z][A-Za-z0-9._-]{2,}|[a-z]+(?:-[a-z]+)+)\b/g;

const normalizeWhitespace = (value: string): string => {
  return value.replace(/\s+/g, " ").trim();
};

const removeNoiseElements = (root: Element): void => {
  root.querySelectorAll(NOISE_SELECTORS).forEach((element) => {
    element.remove();
  });
};

const serializeTable = (table: Element): string => {
  const rows = [...table.querySelectorAll("tr")].map((row) => {
    const cells = [...row.querySelectorAll("th, td")].map((cell) =>
      normalizeWhitespace(cell.textContent ?? ""),
    );

    return `| ${cells.join(" | ")} |`;
  });

  if (rows.length === 0) {
    return "";
  }

  const headerSeparator = `| ${rows[0]
    ?.split("|")
    .slice(1, -1)
    .map(() => "---")
    .join(" | ")} |`;

  return [rows[0], headerSeparator, ...rows.slice(1)].join("\n");
};

const serializeList = (list: Element): string => {
  const tagName = list.tagName.toLowerCase();
  const isOrdered = tagName === "ol";

  return [...list.querySelectorAll(":scope > li")]
    .map((item, index) => {
      const prefix = isOrdered ? `${index + 1}. ` : "- ";
      return `${prefix}${normalizeWhitespace(item.textContent ?? "")}`;
    })
    .join("\n");
};

const extractGlossaryFromText = (text: string): ClaudeGlossaryTerm[] => {
  const terms = new Map<string, ClaudeGlossaryTerm>();

  for (const match of text.matchAll(GLOSSARY_CANDIDATE_PATTERN)) {
    const term = match[1]?.trim();

    if (!term || term.length < 3 || terms.has(term)) {
      continue;
    }

    if (/^(The|And|For|With|This|That|From)$/i.test(term)) {
      continue;
    }

    terms.set(term, { term });
  }

  return [...terms.values()].slice(0, 24);
};

export const extractStructuredHtml = (
  html: string,
  pageUrl: string,
  fallbackTitle: string,
): StructuredExtractionResult => {
  const document = createDocumentFromHtml(html, pageUrl);
  const root = getDocumentContentRoot(document).cloneNode(true) as Element;

  removeNoiseElements(root);

  const preservedCodeBlocks: PreservedCodeBlock[] = [];
  const textBlocks: string[] = [];
  let codeBlockIndex = 0;

  const pageTitle =
    normalizeWhitespace(document.querySelector("title")?.textContent ?? "") ||
    fallbackTitle;

  const walk = (node: Node): void => {
    if (node.nodeType === TEXT_NODE) {
      const text = normalizeWhitespace(node.textContent ?? "");

      if (text) {
        textBlocks.push(text);
      }

      return;
    }

    if (node.nodeType !== ELEMENT_NODE) {
      return;
    }

    const element = node as Element;
    const tagName = element.tagName.toUpperCase();

    if (tagName === "SCRIPT" || tagName === "STYLE") {
      return;
    }

    if (tagName === "PRE") {
      const codeElement = element.querySelector("code");
      const code = (codeElement?.textContent ?? element.textContent ?? "").trim();

      if (!code) {
        return;
      }

      const language =
        codeElement?.className.match(/language-([\w-]+)/i)?.[1] ??
        element.className.match(/language-([\w-]+)/i)?.[1] ??
        "text";
      const blockId = `code-${codeBlockIndex}`;

      codeBlockIndex += 1;
      preservedCodeBlocks.push({
        id: blockId,
        language,
        code,
      });
      textBlocks.push(`[CODE_BLOCK:${blockId}]`);
      return;
    }

    if (tagName === "CODE" && INLINE_CODE_PARENT_TAGS.has(element.parentElement?.tagName ?? "")) {
      const code = normalizeWhitespace(element.textContent ?? "");

      if (code) {
        textBlocks.push(`\`${code}\``);
      }

      return;
    }

    if (/^H[1-3]$/.test(tagName)) {
      const level = Number(tagName.slice(1));
      const heading = normalizeWhitespace(element.textContent ?? "");

      if (heading) {
        textBlocks.push(`\n${"#".repeat(level)} ${heading}\n`);
      }

      return;
    }

    if (tagName === "P") {
      const paragraph = normalizeWhitespace(element.textContent ?? "");

      if (paragraph) {
        textBlocks.push(paragraph);
      }

      return;
    }

    if (tagName === "UL" || tagName === "OL") {
      const listText = serializeList(element);

      if (listText) {
        textBlocks.push(listText);
      }

      return;
    }

    if (tagName === "TABLE") {
      const tableText = serializeTable(element);

      if (tableText) {
        textBlocks.push(tableText);
      }

      return;
    }

    if (tagName === "BLOCKQUOTE") {
      const quote = normalizeWhitespace(element.textContent ?? "");

      if (quote) {
        textBlocks.push(`> ${quote}`);
      }

      return;
    }

    element.childNodes.forEach(walk);
  };

  root.childNodes.forEach(walk);

  const extractedText = textBlocks
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    sourceTitle: pageTitle,
    extractedText,
    preservedCodeBlocks,
    glossary: extractGlossaryFromText(extractedText),
  };
};
