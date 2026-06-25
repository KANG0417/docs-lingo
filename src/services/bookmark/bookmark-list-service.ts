import { normalizeDocumentUrl } from "@/lib/document/normalize-document-url";
import { parseStoredDocumentImages } from "@/lib/document/parse-document-images";
import { toPublicDocumentUrl } from "@/lib/document/text-document-url";
import { buildTranslationHistorySummary } from "@/lib/translation/history/build-history-summary";
import { resolveTranslationContents } from "@/lib/translation/resolve-translation-contents";
import { buildDocumentDisplayTitle } from "@/lib/translation/engine/translate-document-slug";
import { getSupabaseAdminClient } from "@/lib/supabase/supabase-admin";
import { fetchUserFolders } from "@/services/bookmark/bookmark-default-folder";
import type { DocumentCodeBlock } from "@/types/document-code-block";
import type { DocumentImage } from "@/types/document-image";
import type { BookmarkListItem, BookmarksResponse } from "@/types/bookmark";
import type { DocumentTranslationResult, KeywordTerm } from "@/types/translation";
import type { DocumentType } from "@/types/claude-document-translation";

interface BookmarkRow {
  id: string;
  document_id: string;
  folder_id: string | null;
  created_at: string;
  documents: DocumentRow | DocumentRow[] | null;
}

interface DocumentRow {
  id: string;
  title: string | null;
  url: string;
}

interface TranslationRow {
  id: string;
  document_id: string;
  content: string;
  summary_content: string | null;
  original_content: string | null;
  summary_terms: KeywordTerm[] | null;
  document_images: DocumentImage[] | null;
  document_code_blocks: DocumentCodeBlock[] | null;
  document_type: DocumentType | null;
  translation_warnings: string[] | null;
  created_at: string;
}

const resolveDocumentRow = (
  documents: DocumentRow | DocumentRow[] | null,
): DocumentRow | null => {
  if (!documents) {
    return null;
  }

  return Array.isArray(documents) ? (documents[0] ?? null) : documents;
};

const mapTranslationResult = (
  row: TranslationRow,
  document: DocumentRow,
): DocumentTranslationResult => {
  const url = toPublicDocumentUrl(normalizeDocumentUrl(document.url));
  const title = buildDocumentDisplayTitle(url, document.title ?? "제목 없음");

  const {
    translatedSummaryContent,
    translatedFullContent,
  } = resolveTranslationContents(row.content, row.summary_content);

  return {
    id: row.id,
    documentId: row.document_id,
    title,
    fullTitle: title,
    url,
    originalContent: row.original_content ?? "",
    translatedSummaryContent,
    translatedFullContent,
    translatedContent: translatedSummaryContent,
    summaryTerms: row.summary_terms ?? [],
    documentImages: parseStoredDocumentImages(row.document_images),
    documentCodeBlocks: row.document_code_blocks ?? [],
    documentType: row.document_type ?? "other",
    warnings: row.translation_warnings ?? [],
    createdAt: row.created_at,
  };
};

const TRANSLATIONS_SELECT_FULL =
  "id, document_id, content, summary_content, original_content, summary_terms, document_images, document_code_blocks, document_type, translation_warnings, created_at";

const TRANSLATIONS_SELECT_LEGACY =
  "id, document_id, content, created_at";

const isMissingTranslationColumnError = (message: string): boolean => {
  const loweredMessage = message.toLowerCase();

  return (
    loweredMessage.includes("original_content") ||
    loweredMessage.includes("summary_terms") ||
    loweredMessage.includes("document_images") ||
    loweredMessage.includes("document_code_blocks") ||
    loweredMessage.includes("summary_content") ||
    loweredMessage.includes("document_type") ||
    loweredMessage.includes("translation_warnings")
  );
};

const fetchLatestTranslationsForDocuments = async (
  userId: string,
  documentIds: string[],
): Promise<TranslationRow[]> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { data, error } = await supabase
    .from("translations")
    .select(TRANSLATIONS_SELECT_FULL)
    .eq("user_id", userId)
    .in("document_id", documentIds)
    .order("created_at", { ascending: false });

  if (!error) {
    return (data ?? []) as TranslationRow[];
  }

  if (!isMissingTranslationColumnError(error.message)) {
    throw new Error(error.message);
  }

  const legacyResult = await supabase
    .from("translations")
    .select(TRANSLATIONS_SELECT_LEGACY)
    .eq("user_id", userId)
    .in("document_id", documentIds)
    .order("created_at", { ascending: false });

  if (legacyResult.error) {
    throw new Error(legacyResult.error.message);
  }

  return ((legacyResult.data ?? []) as TranslationRow[]).map((row) => ({
    ...row,
    summary_content: null,
    original_content: null,
    summary_terms: [],
    document_images: [],
    document_code_blocks: [],
    document_type: null,
    translation_warnings: [],
  }));
};

const pickLatestTranslationsByDocument = (
  rows: TranslationRow[],
): Map<string, TranslationRow> => {
  const latestByDocument = new Map<string, TranslationRow>();

  rows.forEach((row) => {
    if (!latestByDocument.has(row.document_id)) {
      latestByDocument.set(row.document_id, row);
    }
  });

  return latestByDocument;
};

export const getUserBookmarks = async (
  userId: string,
): Promise<BookmarksResponse> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { data: bookmarkRows, error: bookmarkError } = await supabase
    .from("bookmarks")
    .select("id, document_id, folder_id, created_at, documents(id, title, url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (bookmarkError) {
    console.error("[getUserBookmarks] bookmarks", bookmarkError.message);
    throw new Error("북마크 목록을 불러오지 못했습니다.");
  }

  const folders = await fetchUserFolders(userId);
  const defaultFolderId = folders.find((folder) => folder.isDefault)?.id ?? null;

  const bookmarks = (bookmarkRows ?? []) as unknown as BookmarkRow[];

  if (bookmarks.length === 0) {
    return { folders, items: [] };
  }

  const documentIds = bookmarks.map((bookmark) => bookmark.document_id);

  let translationRows: TranslationRow[];

  try {
    translationRows = await fetchLatestTranslationsForDocuments(
      userId,
      documentIds,
    );
  } catch (translationError) {
    const message =
      translationError instanceof Error
        ? translationError.message
        : "북마크 번역 내용을 불러오지 못했습니다.";

    console.error("[getUserBookmarks] translations", message);
    throw new Error("북마크 번역 내용을 불러오지 못했습니다.");
  }

  const latestTranslations = pickLatestTranslationsByDocument(translationRows);

  const items: BookmarkListItem[] = bookmarks.flatMap((bookmark) => {
    const document = resolveDocumentRow(bookmark.documents);

    if (!document) {
      return [];
    }

    const url = toPublicDocumentUrl(normalizeDocumentUrl(document.url));
    const title = buildDocumentDisplayTitle(url, document.title ?? "제목 없음");
    const translationRow = latestTranslations.get(bookmark.document_id);
    const translation = translationRow
      ? mapTranslationResult(translationRow, document)
      : null;
    const summaryTerms = translation?.summaryTerms ?? [];

    return [
      {
        bookmarkId: bookmark.id,
        documentId: bookmark.document_id,
        folderId: bookmark.folder_id ?? defaultFolderId,
        title,
        url,
        historySummary: buildTranslationHistorySummary({
          title: document.title ?? "제목 없음",
          url,
          summaryTerms,
        }),
        bookmarkedAt: bookmark.created_at,
        translation,
      },
    ];
  });

  return { folders, items };
};
