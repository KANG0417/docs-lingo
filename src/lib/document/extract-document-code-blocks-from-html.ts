import {
  createDocumentFromHtml,
  getDocumentContentRoot,
} from "@/lib/document/html-document";
import type {
  DocumentCodeBlock,
  DocumentCodeBlockVariant,
} from "@/types/document-code-block";

const MAX_CODE_BLOCKS = 20;

const extractCodeText = (codeElement: Element | null): string => {
  if (!codeElement) {
    return "";
  }

  return (codeElement.textContent ?? "").replace(/\n$/, "");
};

const extractTabLabels = (block: Element): string[] => {
  return Array.from(block.querySelectorAll('[data-geist-tab][value]'))
    .map((tab) => tab.getAttribute("value")?.trim() ?? "")
    .filter(Boolean);
};

const inferLanguage = (code: string, filename: string | null): string => {
  if (filename?.endsWith(".json")) {
    return "json";
  }

  if (/^(pnpm|npm|yarn|bun|npx)\s/m.test(code)) {
    return "bash";
  }

  return "text";
};

export const extractDocumentCodeBlocksFromHtml = (
  html: string,
  pageUrl: string,
): DocumentCodeBlock[] => {
  const document = createDocumentFromHtml(html, pageUrl);
  const root = getDocumentContentRoot(document);
  const blocks: DocumentCodeBlock[] = [];
  let sectionIndex = 0;
  let currentHeading: string | null = null;
  let blockCount = 0;

  const walk = (node: Element): void => {
    if (blockCount >= MAX_CODE_BLOCKS) {
      return;
    }

    const tagName = node.tagName.toLowerCase();

    if (/^h[1-3]$/.test(tagName)) {
      const headingText = node.textContent?.trim() ?? "";

      if (headingText) {
        currentHeading = headingText;
        sectionIndex += 1;
      }

      return;
    }

    if (node.matches('[data-geist-code-block], pre')) {
      const isGeistBlock = node.hasAttribute("data-geist-code-block");
      const container = isGeistBlock ? node : node.closest('[data-geist-code-block]') ?? node;
      const codeElement = container.querySelector("pre code") ?? container.querySelector("code");
      const code = extractCodeText(codeElement);

      if (!code.trim()) {
        return;
      }

      const tabLabels = isGeistBlock ? extractTabLabels(container) : [];
      const filenameLabel =
        container.querySelector('[class*="truncate"]')?.textContent?.trim() ?? null;
      const language = inferLanguage(code, filenameLabel);

      const variants: DocumentCodeBlockVariant[] =
        tabLabels.length > 0
          ? tabLabels.map((packageManager) => ({
              packageManager,
              code: packageManager === tabLabels[0] ? code : "",
              language,
            }))
          : [
              {
                packageManager: "",
                code,
                language,
              },
            ];

      blocks.push({
        id: `code-${blockCount}`,
        label: filenameLabel === "Terminal" ? "Terminal" : filenameLabel,
        sectionIndex,
        sectionHeading: currentHeading,
        variants,
      });
      blockCount += 1;
      return;
    }

    Array.from(node.children).forEach((child) => {
      walk(child as Element);
    });
  };

  walk(root);

  return blocks;
};
