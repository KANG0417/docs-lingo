export interface TranslationContentSection {
  heading: string | null;
  body: string;
}

export const isSectionHeadingLine = (line: string): boolean => {
  const trimmed = line.trim();

  if (!trimmed || trimmed.length > 100) {
    return false;
  }

  if (
    trimmed.endsWith("?") &&
    trimmed.split(/\s+/).filter(Boolean).length <= 12
  ) {
    return true;
  }

  if (trimmed.endsWith("!") || /[.]$/.test(trimmed)) {
    return false;
  }

  if (/^#{1,6}\s/.test(trimmed)) {
    return true;
  }

  if (
    trimmed.length <= 80 &&
    /^[A-Z][\w'()-]*(?:\s+[A-Za-z][\w'()-]*){0,8}$/.test(trimmed)
  ) {
    return true;
  }

  if (
    /[\u3131-\uD7A3]/.test(trimmed) &&
    trimmed.length <= 48 &&
    !/[:：`]/.test(trimmed) &&
    !trimmed.endsWith(".")
  ) {
    return true;
  }

  return false;
};

const isStandaloneHeadingBlock = (block: string): boolean => {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length === 1 && isSectionHeadingLine(lines[0] ?? "");
};

export const splitContentBySections = (
  content: string,
): TranslationContentSection[] => {
  const normalizedContent = content.replace(/\r\n/g, "\n").trim();

  if (!normalizedContent) {
    return [];
  }

  const blocks = normalizedContent
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  const sections: TranslationContentSection[] = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const newlineIndex = block.indexOf("\n");

    if (newlineIndex === -1) {
      if (isStandaloneHeadingBlock(block)) {
        const nextBlock = blocks[index + 1];

        if (nextBlock && !isStandaloneHeadingBlock(nextBlock)) {
          sections.push({ heading: block, body: nextBlock });
          index += 1;
        } else {
          sections.push({ heading: block, body: "" });
        }

        continue;
      }

      sections.push({ heading: null, body: block });
      continue;
    }

    const firstLine = block.slice(0, newlineIndex).trim();
    const rest = block.slice(newlineIndex + 1).trim();

    if (isSectionHeadingLine(firstLine)) {
      sections.push({ heading: firstLine, body: rest });
      continue;
    }

    sections.push({ heading: null, body: block });
  }

  return sections.filter((section) => section.heading || section.body);
};

export const formatSectionsAsContent = (
  sections: TranslationContentSection[],
): string => {
  return sections
    .map((section) => {
      if (section.heading && section.body) {
        return `${section.heading}\n\n${section.body}`;
      }

      if (section.heading) {
        return section.heading;
      }

      return section.body;
    })
    .filter((block) => block.length > 0)
    .join("\n\n");
};
