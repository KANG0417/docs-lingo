import { MAX_BOOKMARK_FOLDER_NAME_LENGTH } from "@/constants/bookmark";

const getGraphemeSegmenter = (): Intl.Segmenter | null => {
  try {
    return new Intl.Segmenter("ko", { granularity: "grapheme" });
  } catch {
    return null;
  }
};

const splitFolderNameGraphemes = (value: string): string[] => {
  const segmenter = getGraphemeSegmenter();

  if (!segmenter) {
    return Array.from(value);
  }

  return Array.from(segmenter.segment(value), (segment) => segment.segment);
};

export const getFolderNameLength = (value: string): number =>
  splitFolderNameGraphemes(value).length;

export const enforceFolderNameMaxLength = (value: string): string =>
  splitFolderNameGraphemes(value)
    .slice(0, MAX_BOOKMARK_FOLDER_NAME_LENGTH)
    .join("");

export const validateFolderName = (raw: string): string | null => {
  const trimmedName = raw.trim();

  if (!trimmedName) {
    return "폴더 이름을 입력해 주세요.";
  }

  if (getFolderNameLength(trimmedName) > MAX_BOOKMARK_FOLDER_NAME_LENGTH) {
    return `폴더 이름은 ${MAX_BOOKMARK_FOLDER_NAME_LENGTH}자 이하로 입력해 주세요.`;
  }

  return null;
};
