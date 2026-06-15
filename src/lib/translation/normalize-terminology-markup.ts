import { normalizeInlineMarkupSource } from "@/lib/translation/inline-markup-utils";

const FILE_EXTENSIONS = new Set([
  "js",
  "ts",
  "tsx",
  "jsx",
  "mjs",
  "cjs",
  "json",
  "yaml",
  "yml",
  "md",
  "css",
  "html",
  "config",
]);

const isFileOrPathToken = (value: string): boolean => {
  if (/[\\/]/.test(value)) {
    return true;
  }

  if (/^[@#]/.test(value)) {
    return true;
  }

  const extensionMatch = value.match(/\.([a-z0-9]+)$/i);
  if (!extensionMatch) {
    return false;
  }

  const extension = extensionMatch[1]?.toLowerCase() ?? "";
  if (!FILE_EXTENSIONS.has(extension)) {
    return false;
  }

  const baseName = value.slice(0, -(extension.length + 1));

  if (/[.-]/.test(baseName) && /[a-z]/.test(baseName)) {
    return true;
  }

  return baseName === baseName.toLowerCase();
};

const isCodeLikeToken = (value: string): boolean => {
  if (/^(npm|yarn|pnpm|bun)\s/i.test(value)) {
    return true;
  }

  if (/=/.test(value)) {
    return true;
  }

  return isFileOrPathToken(value);
};

const isMultiWordConcept = (value: string): boolean => {
  const trimmed = value.trim();

  if (!/\s/.test(trimmed)) {
    return false;
  }

  if (isCodeLikeToken(trimmed)) {
    return false;
  }

  return /^[A-Za-z][A-Za-z0-9\s'-]+$/.test(trimmed);
};

const isSingleWordIdentifier = (value: string): boolean => {
  const trimmed = value.trim();

  if (/\s/.test(trimmed)) {
    return false;
  }

  if (isCodeLikeToken(trimmed)) {
    return true;
  }

  return /^[A-Za-z][A-Za-z0-9._-]*$/.test(trimmed);
};

export const normalizeTerminologyMarkup = (content: string): string => {
  const normalizedSource = normalizeInlineMarkupSource(content);

  const normalizedBackticks = normalizedSource.replace(
    /`([^`\n]+)`/g,
    (fullMatch, inner: string) => {
      const trimmed = inner.trim();

      if (isMultiWordConcept(trimmed)) {
        return `<u>${trimmed}</u>`;
      }

      return fullMatch;
    },
  );

  return normalizedBackticks.replace(
    /<u>([^<]+)<\/u>/g,
    (fullMatch, inner: string) => {
      const trimmed = inner.trim();

      if (isSingleWordIdentifier(trimmed) && !isCodeLikeToken(trimmed)) {
        return `\`${trimmed}\``;
      }

      return fullMatch;
    },
  );
};

export const isMultiWordConceptTerm = (term: string): boolean => {
  return isMultiWordConcept(term.trim());
};
