import { MAX_BOOKMARK_FOLDER_NAME_LENGTH } from "@/constants/bookmark";

const buildFolderNameWithSuffix = (
  baseName: string,
  counter: number,
): string => {
  const suffix = ` (${counter})`;
  const maxBaseLength = MAX_BOOKMARK_FOLDER_NAME_LENGTH - suffix.length;

  if (maxBaseLength < 1) {
    return suffix.trim().slice(0, MAX_BOOKMARK_FOLDER_NAME_LENGTH);
  }

  if (baseName.length <= maxBaseLength) {
    return `${baseName}${suffix}`;
  }

  return `${baseName.slice(0, maxBaseLength)}${suffix}`;
};

const extractFolderBaseName = (folderName: string): string => {
  const suffixMatch = folderName.match(/^(.*?) \((\d+)\)$/);

  if (!suffixMatch?.[1]) {
    return folderName;
  }

  return suffixMatch[1];
};

export const resolveUniqueFolderName = (
  desiredName: string,
  existingNames: string[],
): string => {
  const trimmedName = desiredName.trim();

  if (!trimmedName) {
    return trimmedName;
  }

  const takenNames = new Set(existingNames);

  if (!takenNames.has(trimmedName)) {
    return trimmedName.slice(0, MAX_BOOKMARK_FOLDER_NAME_LENGTH);
  }

  const baseName = extractFolderBaseName(trimmedName);

  for (let counter = 1; counter <= 9999; counter += 1) {
    const candidate = buildFolderNameWithSuffix(baseName, counter);

    if (!takenNames.has(candidate)) {
      return candidate;
    }
  }

  throw new Error("사용 가능한 폴더 이름을 찾지 못했습니다.");
};

export const resolveUniqueFolderNames = (
  folderNames: string[],
): string[] => {
  const takenNames: string[] = [];

  return folderNames.map((folderName) => {
    const uniqueName = resolveUniqueFolderName(folderName, takenNames);
    takenNames.push(uniqueName);
    return uniqueName;
  });
};
