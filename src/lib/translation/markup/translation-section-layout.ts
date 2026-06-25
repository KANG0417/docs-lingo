import { KNOWN_SUMMARY_SECTION_TITLES } from "@/constants/translation-section-titles";

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const sortTitlesByLengthDesc = (titles: readonly string[]): string[] => {
  return [...titles].sort((left, right) => right.length - left.length);
};

/** 붙어 나온 요약 섹션 제목 앞뒤에 줄바꿈 삽입 */
export const insertBreaksBeforeKnownSectionTitles = (
  content: string,
): string => {
  let result = content;

  sortTitlesByLengthDesc(KNOWN_SUMMARY_SECTION_TITLES).forEach((title) => {
    const escapedTitle = escapeRegExp(title);

    result = result.replace(
      new RegExp(`([^\\n\\s])(${escapedTitle})`, "gu"),
      "$1\n\n$2",
    );

    result = result.replace(
      new RegExp(`(^|\\n)(${escapedTitle})\\s*([:：-])\\s*([^\\n]+)`, "gu"),
      "$1$2\n\n$4",
    );
  });

  return result;
};

/** 소문자 끝 + 대문자 시작처럼 붙은 영문 제목 분리 (StartedInstallation 등) */
export const insertBreaksBeforeGluedEnglishHeadings = (
  content: string,
): string => {
  return content.replace(/([a-z0-9])([A-Z][a-z])/g, "$1\n\n$2");
};

const splitHeadingFromSameLineBody = (line: string): string => {
  const trimmedLine = line.trim();

  if (!trimmedLine) {
    return line;
  }

  for (const title of sortTitlesByLengthDesc(KNOWN_SUMMARY_SECTION_TITLES)) {
    if (!trimmedLine.startsWith(title)) {
      continue;
    }

    const delimiterMatch = new RegExp(
      `^${escapeRegExp(title)}\\s*[:：-]\\s*([\\s\\S]+)$`,
      "u",
    ).exec(trimmedLine);

    if (delimiterMatch) {
      return `${title}\n\n${delimiterMatch[1]?.trim() ?? ""}`;
    }
  }

  return line;
};

/** 한 줄에 고정 섹션 제목+본문이 붙은 경우만 줄 단위로 분리 */
export const splitGluedHeadingLines = (content: string): string => {
  return content
    .split("\n")
    .map((line) => splitHeadingFromSameLineBody(line))
    .join("\n");
};

export const repairGluedTranslationSections = (content: string): string => {
  let result = content;

  result = insertBreaksBeforeKnownSectionTitles(result);
  result = splitGluedHeadingLines(result);

  return result;
};
