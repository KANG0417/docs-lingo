import { createHash } from "node:crypto";

const TEXT_DOCUMENT_PREFIX = "text://";

export const buildTextDocumentUrl = (text: string): string => {
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new Error("텍스트가 비어 있습니다.");
  }

  const contentHash = createHash("sha256")
    .update(normalizedText)
    .digest("hex")
    .slice(0, 16);

  return `${TEXT_DOCUMENT_PREFIX}${contentHash}`;
};

export const isTextDocumentUrl = (url: string): boolean => {
  return url.startsWith(TEXT_DOCUMENT_PREFIX);
};

/** 클라이언트에 노출할 URL. 직접 입력 텍스트는 null */
export const toPublicDocumentUrl = (url: string | null): string | null => {
  if (!url || isTextDocumentUrl(url)) {
    return null;
  }

  return url;
};
