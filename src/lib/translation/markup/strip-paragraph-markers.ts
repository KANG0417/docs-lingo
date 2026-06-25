const PARAGRAPH_MARKER_PATTERN =
  /^\s*[\[(]?\s*문단\s*(\d+)\s*[\])]?\s*[:：]?\s*/i;

export const stripParagraphMarker = (paragraph: string): string => {
  return paragraph.replace(PARAGRAPH_MARKER_PATTERN, "").trim();
};

export const stripParagraphMarkersFromContent = (content: string): string => {
  return content
    .split("\n")
    .map((line) => line.replace(PARAGRAPH_MARKER_PATTERN, "").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};
