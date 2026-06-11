import type {
  DocumentCodeBlock,
  DocumentCodeBlockVariant,
} from "@/types/document-code-block";

const MAX_CODE_BLOCKS = 20;
const CODE_FENCE_OPEN_REGEX = /^```([a-zA-Z0-9_-]+)(?:\s+package="([^"]+)")?\s*$/;
const CODE_FENCE_CLOSE_REGEX = /^```\s*$/;
const HEADING_REGEX = /^(#{1,3})\s+(.+)$/;

interface ParsedFenceBlock {
  language: string;
  packageManager: string | null;
  code: string;
  lineIndex: number;
}

const parseFenceBlockAt = (
  lines: string[],
  startIndex: number,
): ParsedFenceBlock | null => {
  const openMatch = lines[startIndex]?.match(CODE_FENCE_OPEN_REGEX);

  if (!openMatch) {
    return null;
  }

  const language = openMatch[1] ?? "text";
  const packageManager = openMatch[2] ?? null;
  const codeLines: string[] = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (CODE_FENCE_CLOSE_REGEX.test(lines[index] ?? "")) {
      return {
        language,
        packageManager,
        code: codeLines.join("\n").trimEnd(),
        lineIndex: index,
      };
    }

    codeLines.push(lines[index] ?? "");
  }

  return null;
};

const isPackageManagerGroupStart = (
  lines: string[],
  index: number,
): boolean => {
  const openMatch = lines[index]?.match(CODE_FENCE_OPEN_REGEX);
  return Boolean(openMatch?.[2]);
};

const collectPackageManagerGroup = (
  lines: string[],
  startIndex: number,
): { variants: DocumentCodeBlockVariant[]; endIndex: number } | null => {
  const variants: DocumentCodeBlockVariant[] = [];
  let cursor = startIndex;

  while (cursor < lines.length) {
    while (cursor < lines.length && lines[cursor]?.trim() === "") {
      cursor += 1;
    }

    if (!isPackageManagerGroupStart(lines, cursor)) {
      break;
    }

    const parsedBlock = parseFenceBlockAt(lines, cursor);

    if (!parsedBlock?.packageManager) {
      break;
    }

    variants.push({
      packageManager: parsedBlock.packageManager,
      code: parsedBlock.code,
      language: parsedBlock.language,
    });
    cursor = parsedBlock.lineIndex + 1;
  }

  if (variants.length === 0) {
    return null;
  }

  return {
    variants,
    endIndex: cursor - 1,
  };
};

const formatCodeBlockLabel = (language: string): string | null => {
  if (language === "bash" || language === "sh" || language === "shell") {
    return "Terminal";
  }

  if (language === "json") {
    return "package.json";
  }

  return null;
};

export const extractDocumentCodeBlocksFromMarkdown = (
  markdown: string,
): DocumentCodeBlock[] => {
  const lines = markdown.split(/\r?\n/);
  const blocks: DocumentCodeBlock[] = [];
  let sectionIndex = 0;
  let currentHeading: string | null = null;
  let blockCount = 0;

  for (let index = 0; index < lines.length; index += 1) {
    if (blockCount >= MAX_CODE_BLOCKS) {
      break;
    }

    const headingMatch = lines[index]?.match(HEADING_REGEX);

    if (headingMatch) {
      const level = headingMatch[1]?.length ?? 0;
      const headingText = headingMatch[2]?.trim() ?? "";

      if (level >= 2 && headingText) {
        sectionIndex += 1;
        currentHeading = headingText;
      }

      continue;
    }

    if (isPackageManagerGroupStart(lines, index)) {
      const group = collectPackageManagerGroup(lines, index);

      if (!group) {
        continue;
      }

      blocks.push({
        id: `code-${blockCount}`,
        label: formatCodeBlockLabel(group.variants[0]?.language ?? "bash"),
        sectionIndex,
        sectionHeading: currentHeading,
        variants: group.variants,
      });
      blockCount += 1;
      index = group.endIndex;
      continue;
    }

    const parsedBlock = parseFenceBlockAt(lines, index);

    if (!parsedBlock || parsedBlock.packageManager) {
      continue;
    }

    if (!parsedBlock.code.trim()) {
      index = parsedBlock.lineIndex;
      continue;
    }

    blocks.push({
      id: `code-${blockCount}`,
      label: formatCodeBlockLabel(parsedBlock.language),
      sectionIndex,
      sectionHeading: currentHeading,
      variants: [
        {
          packageManager: "",
          code: parsedBlock.code,
          language: parsedBlock.language,
        },
      ],
    });
    blockCount += 1;
    index = parsedBlock.lineIndex;
  }

  return blocks;
};
