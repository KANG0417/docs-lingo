import { processRefinedDocument } from "@/lib/translation/document-ai-processor";
import { refineDocumentFromText } from "@/lib/document-pipeline/refine-document-from-text";
import { refineDocumentFromUrl } from "@/lib/document-pipeline/refine-document";
import { isPaginationDocumentUrl } from "@/lib/document/normalize-document-url";
import { toPublicDocumentUrl } from "@/lib/document/text-document-url";
import { buildDocumentDisplayTitle } from "@/lib/translation/engine/translate-document-slug";
import { shouldPersistTranslation } from "@/lib/translation/should-persist-translation";
import {
  TranslationError,
  toTranslationError,
} from "@/lib/translation/translation-errors";
import { ensureUserProfileExists } from "@/services/profile-service";
import { generateTextDocumentTitle } from "@/lib/translation/engine/generate-text-document-title";
import { getUserAiCredentials } from "@/services/ai-settings-service";
import { saveTranslation } from "@/services/translation/translation-persistence-service";
import type { DocumentCodeBlock } from "@/types/document-code-block";
import type { DocumentImage } from "@/types/document-image";
import type { RefinedDocument } from "@/types/document-pipeline";
import type { DocumentTranslationResult, KeywordTerm } from "@/types/translation";
import type { DocumentType } from "@/types/claude-document-translation";

const buildLocalTranslationResult = (
  localId: string,
  refinedDocument: {
    title: string;
    url: string;
    originalContent: string;
  },
  processedDocument: {
    translatedTitle?: string;
    translatedSummaryContent: string;
    translatedFullContent: string;
    translatedContent: string;
    summaryTerms: KeywordTerm[];
    documentImages: DocumentImage[];
    documentCodeBlocks: DocumentCodeBlock[];
    documentType: DocumentType;
    warnings: string[];
  },
): DocumentTranslationResult => {
  return {
    id: localId,
    documentId: localId,
    title: buildDocumentDisplayTitle(refinedDocument.url, refinedDocument.title),
    fullTitle: buildDocumentDisplayTitle(
      refinedDocument.url,
      refinedDocument.title,
    ),
    url: toPublicDocumentUrl(refinedDocument.url),
    originalContent: refinedDocument.originalContent,
    translatedSummaryContent: processedDocument.translatedSummaryContent,
    translatedFullContent: processedDocument.translatedFullContent,
    translatedContent: processedDocument.translatedContent,
    summaryTerms: processedDocument.summaryTerms,
    documentImages: processedDocument.documentImages,
    documentCodeBlocks: processedDocument.documentCodeBlocks,
    documentType: processedDocument.documentType,
    warnings: processedDocument.warnings,
    createdAt: new Date().toISOString(),
  };
};

const translateRefinedDocument = async (
  userId: string,
  refinedDocument: RefinedDocument,
): Promise<DocumentTranslationResult> => {
  const userAiCredentials = await getUserAiCredentials(userId);

  let processedDocument: Awaited<ReturnType<typeof processRefinedDocument>>;

  try {
    processedDocument = await processRefinedDocument(
      refinedDocument.title,
      refinedDocument.originalContent,
      refinedDocument.aiInput,
      refinedDocument.summaryAiInput,
      refinedDocument.claudeTranslationRequest,
      refinedDocument.documentImages,
      refinedDocument.documentCodeBlocks,
      userAiCredentials,
    );
  } catch (error) {
    throw toTranslationError(error);
  }

  const {
    translatedSummaryContent,
    translatedFullContent,
    summaryTerms,
    documentImages,
    documentCodeBlocks,
    documentType,
    warnings,
  } = processedDocument;
  const fullTitle = buildDocumentDisplayTitle(
    refinedDocument.url,
    refinedDocument.title,
  );
  const summaryContent =
    translatedSummaryContent.trim() || translatedFullContent.trim();

  if (!summaryContent) {
    throw new TranslationError(
      "DOCUMENT_EMPTY",
      "번역 결과가 없어 히스토리에 저장하지 않았습니다.",
      "Empty translated content",
    );
  }

  if (isPaginationDocumentUrl(refinedDocument.url)) {
    return buildLocalTranslationResult(
      "local-pagination",
      refinedDocument,
      processedDocument,
    );
  }

  if (!shouldPersistTranslation(refinedDocument.originalContent, summaryContent)) {
    return buildLocalTranslationResult(
      "local-untranslated",
      refinedDocument,
      processedDocument,
    );
  }

  return saveTranslation({
    userId,
    url: refinedDocument.url,
    title: fullTitle,
    fullTitle,
    originalContent: refinedDocument.originalContent,
    translatedSummaryContent,
    translatedFullContent,
    summaryTerms,
    documentImages,
    documentCodeBlocks,
    documentType,
    warnings,
  });
};

export const translateDocumentFromUrl = async (
  userId: string,
  url: string,
  userNickname?: string | null,
): Promise<DocumentTranslationResult> => {
  await ensureUserProfileExists(userId, userNickname?.trim() || "사용자");

  let refinedDocument: Awaited<ReturnType<typeof refineDocumentFromUrl>>;

  try {
    refinedDocument = await refineDocumentFromUrl(url);
  } catch (error) {
    throw toTranslationError(error);
  }

  return translateRefinedDocument(userId, refinedDocument);
};

export const translateDocumentFromText = async (
  userId: string,
  text: string,
  userNickname?: string | null,
): Promise<DocumentTranslationResult> => {
  await ensureUserProfileExists(userId, userNickname?.trim() || "사용자");

  const userAiCredentials = await getUserAiCredentials(userId);
  let refinedDocument: Awaited<ReturnType<typeof refineDocumentFromText>>;

  try {
    const title = await generateTextDocumentTitle(text, userAiCredentials);
    refinedDocument = refineDocumentFromText(text, title);
  } catch (error) {
    throw toTranslationError(error);
  }

  return translateRefinedDocument(userId, refinedDocument);
};
