import { parseHTML } from "linkedom";

const normalizeHeadingText = (text: string): string => {
  return text.replace(/\s+/g, " ").trim();
};

const hasSectionAnchorLink = (heading: Element): boolean => {
  return Boolean(
    heading.querySelector('a[href^="#"], a[data-heading-link]'),
  );
};

export const extractLinkedSectionHeadings = (html: string): string[] => {
  const { document } = parseHTML(html);
  const headings: string[] = [];

  document.querySelectorAll("h1, h2").forEach((heading) => {
    if (!hasSectionAnchorLink(heading)) {
      return;
    }

    const text = normalizeHeadingText(heading.textContent ?? "");

    if (!text) {
      return;
    }

    headings.push(text);
  });

  return headings;
};
