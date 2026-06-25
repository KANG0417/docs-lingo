import { MAX_FULL_CHUNK_INPUT_LENGTH } from "@/constants/document-pipeline";

export interface AiInputSectionBlock {
  heading: string | null;
  body: string;
}

const parseAiInputSections = (aiInput: string): {
  header: string;
  sections: AiInputSectionBlock[];
} => {
  const sectionDelimiter = "\n--- 섹션 ---\n";
  const sectionDelimiterIndex = aiInput.indexOf(sectionDelimiter);

  if (sectionDelimiterIndex < 0) {
    return {
      header: aiInput.trim(),
      sections: [],
    };
  }

  const header = aiInput.slice(0, sectionDelimiterIndex).trim();
  const sectionBlocks = aiInput
    .slice(sectionDelimiterIndex)
    .split(sectionDelimiter)
    .map((block) => block.trim())
    .filter(Boolean);

  const sections: AiInputSectionBlock[] = sectionBlocks.map((block) => {
    const headingMatch = block.match(/^\[섹션 제목\]\s*(.+)$/m);

    return {
      heading: headingMatch?.[1]?.trim() ?? null,
      body: block,
    };
  });

  return { header, sections };
};

const formatChunk = (header: string, sectionBodies: string[]): string => {
  const parts = [header, ...sectionBodies].filter((part) => part.trim().length > 0);

  return parts.join("\n\n").trim();
};

/**
 * AI 입력을 섹션 경계 기준으로 나눈다. 섹션 중간은 자르지 않는다.
 */
export const splitAiInputIntoChunks = (
  aiInput: string,
  maxChunkLength: number = MAX_FULL_CHUNK_INPUT_LENGTH,
): string[] => {
  const trimmedInput = aiInput.trim();

  if (trimmedInput.length <= maxChunkLength) {
    return [trimmedInput];
  }

  const { header, sections } = parseAiInputSections(trimmedInput);

  if (sections.length === 0) {
    return [trimmedInput.slice(0, maxChunkLength)];
  }

  const chunks: string[] = [];
  let currentBodies: string[] = [];
  let currentLength = header.length;

  const flushChunk = (): void => {
    if (currentBodies.length === 0) {
      return;
    }

    chunks.push(formatChunk(header, currentBodies));
    currentBodies = [];
    currentLength = header.length;
  };

  sections.forEach((section) => {
    const block = `--- 섹션 ---\n${section.body}`;
    const nextLength =
      currentBodies.length === 0
        ? header.length + block.length
        : currentLength + 2 + block.length;

    if (nextLength > maxChunkLength && currentBodies.length > 0) {
      flushChunk();
    }

    currentBodies.push(block);
    currentLength =
      currentBodies.length === 1
        ? header.length + block.length
        : currentLength + 2 + block.length;
  });

  flushChunk();

  return chunks.length > 0 ? chunks : [trimmedInput.slice(0, maxChunkLength)];
};

export const mergeTranslatedFullChunks = (chunks: string[]): string => {
  return chunks
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .join("\n\n");
};
