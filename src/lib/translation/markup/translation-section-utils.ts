import {
  KNOWN_SUMMARY_SECTION_TITLES,
  isKnownSummarySectionTitle,
  resolveKnownSummarySectionTitle,
  type KnownSummarySectionTitle,
} from "@/constants/translation-section-titles";
import {
  containsInlineTermMarkup,
  resolveSectionHeadingText,
} from "@/lib/translation/markup/inline-markup-utils";

export interface TranslationContentSection {
  heading: string | null;
  body: string;
}

export { isSummaryOutputSectionTitle } from "@/constants/translation-section-titles";

const SUMMARY_SECTION_FALLBACK_BODY: Record<KnownSummarySectionTitle, string> = {
  "한 줄 요약": "문서의 핵심 내용을 한 문장으로 요약하지 못했습니다.",
  "사전 조건": "특별한 사전 조건은 명시되지 않았습니다.",
  "문서 구조": "문서 구조를 추출하지 못했습니다.",
  "핵심 요약": "핵심 요약을 추출하지 못했습니다.",
  "API·설정 요약": "API·설정 중심 설명은 없습니다.",
  "핵심 용어": "아래 핵심키워드 영역에서 용어별 설명을 확인하세요.",
  "코드 예제 설명": "원문에 코드 예제가 없습니다.",
  "주의할 점": "원문에 명확히 강조된 주의사항은 없습니다.",
  "버전 정보": "버전 관련 특이사항은 없습니다.",
};

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const stripHeadingPrefix = (line: string): string => {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\s*(?:\d+[.)]|[-*])\s+/, "")
    .replace(/^\*\*([\s\S]+)\*\*$/, "$1")
    .trim();
};

const toSectionHeading = (line: string): string => {
  return resolveSectionHeadingText(line);
};

const splitKnownSummaryHeadingFromLine = (
  line: string,
): { heading: KnownSummarySectionTitle; body: string } | null => {
  const source = stripHeadingPrefix(line).trim();

  for (const title of [...KNOWN_SUMMARY_SECTION_TITLES].sort(
    (left, right) => right.length - left.length,
  )) {
    if (source === title) {
      return {
        heading: title,
        body: "",
      };
    }

    const withDelimiter = new RegExp(
      `^${escapeRegExp(title)}\\s*[:：-]\\s*([\\s\\S]+)$`,
      "u",
    ).exec(source);

    if (withDelimiter) {
      return {
        heading: title,
        body: withDelimiter[1]?.trim() ?? "",
      };
    }

  }

  const resolved = resolveKnownSummarySectionTitle(source);
  return resolved ? { heading: resolved, body: "" } : null;
};

export const isSectionHeadingLine = (line: string): boolean => {
  const trimmedLine = line.trim();

  if (containsInlineTermMarkup(trimmedLine)) {
    return false;
  }

  const trimmed = resolveSectionHeadingText(trimmedLine);

  if (!trimmed || trimmed.length > 100) {
    return false;
  }

  if (isKnownSummarySectionTitle(trimmed)) {
    return true;
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
    trimmed.length <= 64 &&
    !/[.!]$/.test(trimmed)
  ) {
    const looksLikeBodySentence =
      trimmed.length > 20 ||
      /(입니다|습니다|한다|된다|하는|위한|해야|하면|에서|으로)/.test(
        trimmed,
      );

    return !looksLikeBodySentence && trimmed.split(/\s+/).length <= 6;
  }

  return false;
};

const promoteEmbeddedHeading = (
  section: TranslationContentSection,
): TranslationContentSection => {
  if (section.heading?.trim()) {
    return section;
  }

  const body = section.body.trim();
  if (!body) {
    return section;
  }

  const newlineIndex = body.indexOf("\n");
  if (newlineIndex === -1) {
    if (isSectionHeadingLine(body)) {
      return { heading: toSectionHeading(body), body: "" };
    }

    return section;
  }

  const firstLine = body.slice(0, newlineIndex).trim();
  if (!isSectionHeadingLine(firstLine)) {
    return section;
  }

  return {
    heading: toSectionHeading(firstLine),
    body: body.slice(newlineIndex + 1).trim(),
  };
};

export const normalizeTranslationSections = (
  content: string,
): TranslationContentSection[] => {
  return splitContentBySections(content).map((section) =>
    promoteEmbeddedHeading(section),
  );
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
          sections.push({ heading: toSectionHeading(block), body: nextBlock });
          index += 1;
        } else {
          sections.push({ heading: toSectionHeading(block), body: "" });
        }

        continue;
      }

      sections.push({ heading: null, body: block });
      continue;
    }

    const firstLine = block.slice(0, newlineIndex).trim();
    const rest = block.slice(newlineIndex + 1).trim();

    if (isSectionHeadingLine(firstLine)) {
      sections.push({ heading: toSectionHeading(firstLine), body: rest });
      continue;
    }

    sections.push({ heading: null, body: block });
  }

  return sections.filter((section) => section.heading || section.body);
};

export const splitSummaryOutputSections = (
  content: string,
): TranslationContentSection[] => {
  const normalizedContent = content.replace(/\r\n/g, "\n").trim();

  if (!normalizedContent) {
    return [];
  }

  const sectionMap = new Map<KnownSummarySectionTitle, string[]>();
  const preface: string[] = [];
  let currentHeading: KnownSummarySectionTitle | null = null;

  const appendToCurrent = (line: string): void => {
    const normalizedLine = line.trimEnd();
    const target = currentHeading
      ? (sectionMap.get(currentHeading) ?? [])
      : preface;

    if (!normalizedLine.trim()) {
      if (target.length > 0 && target[target.length - 1] !== "") {
        target.push("");
      }

      if (currentHeading) {
        sectionMap.set(currentHeading, target);
      }
      return;
    }

    if (!currentHeading) {
      preface.push(normalizedLine);
      return;
    }

    target.push(normalizedLine);
    sectionMap.set(currentHeading, target);
  };

  normalizedContent.split("\n").forEach((line) => {
    const headingMatch = splitKnownSummaryHeadingFromLine(line);

    if (headingMatch) {
      currentHeading = headingMatch.heading;

      if (headingMatch.body) {
        appendToCurrent(headingMatch.body);
      }
      return;
    }

    appendToCurrent(line);
  });

  if (!sectionMap.has("한 줄 요약") && preface.length > 0) {
    sectionMap.set("한 줄 요약", preface);
    preface.length = 0;
  }

  if (preface.length > 0) {
    sectionMap.set("핵심 요약", [
      ...(sectionMap.get("핵심 요약") ?? []),
      ...preface,
    ]);
  }

  return KNOWN_SUMMARY_SECTION_TITLES.map((heading) => ({
    heading,
    body:
      sectionMap
        .get(heading)
        ?.join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim() || SUMMARY_SECTION_FALLBACK_BODY[heading],
  }));
};

export const normalizeSummaryOutputSections = (
  content: string,
): TranslationContentSection[] => {
  return splitSummaryOutputSections(content);
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
