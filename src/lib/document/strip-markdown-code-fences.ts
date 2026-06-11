const CODE_FENCE_LINE_REGEX = /^```/;

/** 마크다운 fenced code block(``` ... ```)을 본문에서 제거한다 */
export const stripMarkdownCodeFences = (markdown: string): string => {
  const lines = markdown.split(/\r?\n/);
  const result: string[] = [];
  let inFence = false;

  lines.forEach((line) => {
    if (CODE_FENCE_LINE_REGEX.test(line.trim())) {
      inFence = !inFence;
      return;
    }

    if (!inFence) {
      result.push(line);
    }
  });

  return result
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const containsMarkdownCodeFences = (text: string): boolean => {
  return /```[\s\S]*?```/m.test(text);
};
