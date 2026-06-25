import type { TextSegment } from "@/lib/translation/markup/highlight-keywords";

interface ImportancePattern {
  pattern: RegExp;
}

const IMPORTANCE_PATTERNS: ImportancePattern[] = [
  { pattern: /\d{4}년\s*\d{1,2}월(?:\s*\d{1,2}일)?/g },
  { pattern: /\d{1,2}\/\d{1,2}\/\d{2,4}/g },
  {
    pattern:
      /(?:필수(?:입니다|함)?|권장(?:합니다|함)?|하지\s*않(?:습니다|음)|금지(?:됩니다)?|반드시|지원\s*종료|Breaking\s+change|deprecated)/gi,
  },
  { pattern: /\d+(?:\.\d+){1,2}\s*(?:버전|이상|이하)/g },
];

const collectImportanceMatches = (
  text: string,
): Array<{ start: number; end: number; value: string }> => {
  const matches: Array<{ start: number; end: number; value: string }> = [];

  IMPORTANCE_PATTERNS.forEach(({ pattern }) => {
    const scopedPattern = new RegExp(pattern.source, pattern.flags);

    for (const match of text.matchAll(scopedPattern)) {
      const start = match.index ?? 0;
      const value = match[0];

      if (!value) {
        continue;
      }

      matches.push({
        start,
        end: start + value.length,
        value,
      });
    }
  });

  return matches
    .sort((left, right) => left.start - right.start)
    .filter((match, index, array) => {
      const previous = array[index - 1];

      if (!previous) {
        return true;
      }

      return match.start >= previous.end;
    });
};

export const splitTextByImportancePhrases = (text: string): TextSegment[] => {
  const matches = collectImportanceMatches(text);

  if (matches.length === 0) {
    return [{ type: "text", value: text }];
  }

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  matches.forEach((match) => {
    if (match.start > lastIndex) {
      segments.push({
        type: "text",
        value: text.slice(lastIndex, match.start),
      });
    }

    segments.push({
      type: "bold",
      value: match.value,
    });

    lastIndex = match.end;
  });

  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
};
