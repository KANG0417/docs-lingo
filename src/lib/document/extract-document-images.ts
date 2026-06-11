import {
  createDocumentFromHtml,
  getDocumentContentRoot,
} from "@/lib/document/html-document";
import type { DocumentImage } from "@/types/document-image";

const MAX_DOCUMENT_IMAGES = 8;
const MIN_IMAGE_DIMENSION = 80;

interface MutableDocumentImage {
  id: string;
  url: string;
  alt: string;
  caption: string;
  sectionIndex: number;
  sectionHeading: string | null;
}

const resolveImageUrl = (src: string, pageUrl: string): string | null => {
  try {
    return new URL(src, pageUrl).href;
  } catch {
    return null;
  }
};

const pickImageSource = (element: Element, pageUrl: string): string | null => {
  const srcset = element.getAttribute("srcset");

  if (srcset) {
    const candidates = srcset
      .split(",")
      .map((entry) => entry.trim().split(/\s+/)[0])
      .filter(Boolean);

    const lastCandidate = candidates[candidates.length - 1];

    if (lastCandidate) {
      return resolveImageUrl(lastCandidate, pageUrl);
    }
  }

  const src = element.getAttribute("src");

  if (!src) {
    return null;
  }

  return resolveImageUrl(src, pageUrl);
};

const isDecorativeImage = (element: Element): boolean => {
  const src = element.getAttribute("src") ?? "";
  const alt = (element.getAttribute("alt") ?? "").toLowerCase();
  const className = (element.getAttribute("class") ?? "").toLowerCase();
  const meta = `${alt} ${className} ${src}`.toLowerCase();

  if (!src || src.startsWith("data:image/svg")) {
    return true;
  }

  if (/icon|logo|avatar|badge|emoji|spinner|loading|pixel|tracking/.test(meta)) {
    return true;
  }

  const width = Number.parseInt(element.getAttribute("width") ?? "0", 10);
  const height = Number.parseInt(element.getAttribute("height") ?? "0", 10);

  if (
    width > 0 &&
    height > 0 &&
    (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION)
  ) {
    return true;
  }

  return false;
};

const getContentRoot = (document: Document): Element => {
  return getDocumentContentRoot(document);
};

export const extractDocumentImages = (
  html: string,
  pageUrl: string,
): DocumentImage[] => {
  const document = createDocumentFromHtml(html, pageUrl);
  const root = getContentRoot(document);
  const images: MutableDocumentImage[] = [];
  const seenUrls = new Set<string>();

  let sectionIndex = 0;
  let currentHeading: string | null = null;
  let imageCount = 0;

  const pushImage = (
    element: Element,
    caption: string,
  ): void => {
    if (imageCount >= MAX_DOCUMENT_IMAGES || isDecorativeImage(element)) {
      return;
    }

    const url = pickImageSource(element, pageUrl);

    if (!url || seenUrls.has(url)) {
      return;
    }

    seenUrls.add(url);
    images.push({
      id: `img-${imageCount}`,
      url,
      alt: element.getAttribute("alt")?.trim() ?? "",
      caption,
      sectionIndex,
      sectionHeading: currentHeading,
    });
    imageCount += 1;
  };

  const traverse = (node: Element): void => {
    const tagName = node.tagName.toLowerCase();

    if (/^h[1-3]$/.test(tagName)) {
      const headingText = node.textContent?.trim() ?? "";

      if (headingText) {
        currentHeading = headingText;
        sectionIndex += 1;
      }

      return;
    }

    if (tagName === "figure") {
      const img = node.querySelector("img");

      if (img) {
        const figcaption =
          node.querySelector("figcaption")?.textContent?.trim() ?? "";
        pushImage(img, figcaption);
      }

      return;
    }

    if (tagName === "img") {
      pushImage(node, "");
      return;
    }

    Array.from(node.children).forEach((child) => {
      traverse(child as Element);
    });
  };

  traverse(root);

  return images;
};
