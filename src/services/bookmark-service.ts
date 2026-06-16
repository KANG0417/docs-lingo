import { normalizeDocumentUrl } from "@/lib/document/normalize-document-url";
import { parseStoredDocumentImages } from "@/lib/document/parse-document-images";
import { toPublicDocumentUrl } from "@/lib/document/text-document-url";
import { buildTranslationHistorySummary } from "@/lib/translation/build-history-summary";
import { translateDocumentTitle } from "@/lib/translation/translate-document-title";
import { getSupabaseAdminClient } from "@/lib/supabase/supabase-admin";
import { MAX_BOOKMARK_FOLDER_COUNT, BOOKMARK_DEFAULT_STORAGE_NAME, BOOKMARK_PINNED_FOLDER_LABEL, MAX_BOOKMARK_FOLDER_NAME_LENGTH } from "@/constants/bookmark";
import { resolveUniqueFolderName, resolveUniqueFolderNames } from "@/lib/bookmark/resolve-unique-folder-name";
import { getFolderNameLength } from "@/lib/bookmark/validate-folder-name";
import type { DocumentCodeBlock } from "@/types/document-code-block";
import type { DocumentImage } from "@/types/document-image";
import type {
  BookmarkFolder,
  BookmarkFolderDraft,
  BookmarkListItem,
  BookmarksResponse,
  DocumentBookmarkStatus,
} from "@/types/bookmark";
import type { DocumentTranslationResult, KeywordTerm } from "@/types/translation";

interface BookmarkRow {
  id: string;
  document_id: string;
  folder_id: string | null;
  created_at: string;
  documents: DocumentRow | DocumentRow[] | null;
}

interface BookmarkFolderRow {
  id: string;
  name: string;
  sort_order?: number | null;
  is_default?: boolean | null;
  created_at: string;
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
  original_content: string | null;
  summary_terms: KeywordTerm[] | null;
  document_images: DocumentImage[] | null;
  document_code_blocks: DocumentCodeBlock[] | null;
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
  const title = translateDocumentTitle(document.title ?? "제목 없음");
  const url = toPublicDocumentUrl(normalizeDocumentUrl(document.url));

  return {
    id: row.id,
    documentId: row.document_id,
    title,
    url,
    originalContent: row.original_content ?? "",
    translatedContent: row.content,
    summaryTerms: row.summary_terms ?? [],
    documentImages: parseStoredDocumentImages(row.document_images),
    documentCodeBlocks: row.document_code_blocks ?? [],
    createdAt: row.created_at,
  };
};

const TRANSLATIONS_SELECT_FULL =
  "id, document_id, content, original_content, summary_terms, document_images, document_code_blocks, created_at";

const TRANSLATIONS_SELECT_LEGACY =
  "id, document_id, content, created_at";

const isMissingTranslationColumnError = (message: string): boolean => {
  const loweredMessage = message.toLowerCase();

  return (
    loweredMessage.includes("original_content") ||
    loweredMessage.includes("summary_terms") ||
    loweredMessage.includes("document_images") ||
    loweredMessage.includes("document_code_blocks")
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
    original_content: null,
    summary_terms: [],
    document_images: [],
    document_code_blocks: [],
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

const mapFolderRow = (
  row: BookmarkFolderRow,
  index: number,
  isDefaultOverride?: boolean,
): BookmarkFolder => {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order ?? index,
    isDefault: isDefaultOverride ?? Boolean(row.is_default),
    createdAt: row.created_at,
  };
};

const isMissingFolderSortOrderError = (message: string): boolean => {
  return message.toLowerCase().includes("sort_order");
};

const isMissingFolderIsDefaultError = (message: string): boolean => {
  return message.toLowerCase().includes("is_default");
};

const isMissingFolderIdColumnError = (message: string): boolean => {
  return message.toLowerCase().includes("folder_id");
};

const isMissingFolderColumnError = (message: string): boolean => {
  return (
    isMissingFolderSortOrderError(message) ||
    isMissingFolderIsDefaultError(message)
  );
};

const isUniqueViolationError = (message: string): boolean => {
  const loweredMessage = message.toLowerCase();

  return (
    loweredMessage.includes("duplicate key") ||
    loweredMessage.includes("unique constraint") ||
    loweredMessage.includes("23505")
  );
};

const FOLDER_SELECT_FULL = "id, name, sort_order, is_default, created_at";
const FOLDER_SELECT_LEGACY = "id, name, created_at";

const queryUserFolderRows = async (
  userId: string,
): Promise<BookmarkFolderRow[]> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { data, error } = await supabase
    .from("bookmark_folders")
    .select(FOLDER_SELECT_FULL)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!error) {
    return (data ?? []) as BookmarkFolderRow[];
  }

  if (
    !isMissingFolderSortOrderError(error.message) &&
    !isMissingFolderIsDefaultError(error.message)
  ) {
    throw new Error(error.message);
  }

  const legacyResult = await supabase
    .from("bookmark_folders")
    .select(FOLDER_SELECT_LEGACY)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (legacyResult.error) {
    throw new Error(legacyResult.error.message);
  }

  return ((legacyResult.data ?? []) as BookmarkFolderRow[]).map((row, index) => ({
    ...row,
    sort_order: index,
    is_default: index === 0 && row.name === BOOKMARK_DEFAULT_STORAGE_NAME,
  }));
};

const migrateNullFolderBookmarks = async (
  userId: string,
  defaultFolderId: string,
): Promise<void> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { error } = await supabase
    .from("bookmarks")
    .update({ folder_id: defaultFolderId })
    .eq("user_id", userId)
    .is("folder_id", null);

  if (error) {
    if (isMissingFolderIdColumnError(error.message)) {
      return;
    }

    console.error("[migrateNullFolderBookmarks]", error.message);
    throw new Error("기본 저장소로 북마크를 옮기지 못했습니다.");
  }
};

const fetchDefaultFolderRowByName = async (
  userId: string,
): Promise<BookmarkFolderRow | null> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { data, error } = await supabase
    .from("bookmark_folders")
    .select(FOLDER_SELECT_LEGACY)
    .eq("user_id", userId)
    .eq("name", BOOKMARK_DEFAULT_STORAGE_NAME)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as BookmarkFolderRow;
};

const insertDefaultBookmarkFolderRow = async (
  userId: string,
): Promise<BookmarkFolderRow> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const payloadVariants: Array<Record<string, string | number | boolean>> = [
    {
      user_id: userId,
      name: BOOKMARK_DEFAULT_STORAGE_NAME,
      sort_order: 0,
      is_default: true,
    },
    {
      user_id: userId,
      name: BOOKMARK_DEFAULT_STORAGE_NAME,
      sort_order: 0,
    },
    {
      user_id: userId,
      name: BOOKMARK_DEFAULT_STORAGE_NAME,
    },
  ];

  let lastErrorMessage: string | null = null;

  for (const payload of payloadVariants) {
    const { data, error } = await supabase
      .from("bookmark_folders")
      .insert(payload)
      .select(FOLDER_SELECT_LEGACY)
      .single();

    if (!error && data) {
      return data as BookmarkFolderRow;
    }

    lastErrorMessage = error?.message ?? "알 수 없는 오류";

    if (isUniqueViolationError(lastErrorMessage)) {
      const existingFolder = await fetchDefaultFolderRowByName(userId);

      if (existingFolder) {
        return existingFolder;
      }

      break;
    }

    if (!isMissingFolderColumnError(lastErrorMessage)) {
      break;
    }
  }

  const existingFolder = await fetchDefaultFolderRowByName(userId);

  if (existingFolder) {
    return existingFolder;
  }

  console.error("[insertDefaultBookmarkFolderRow]", lastErrorMessage);
  throw new Error("기본 저장소를 만들지 못했습니다.");
};

const ensureDefaultBookmarkFolder = async (
  userId: string,
): Promise<BookmarkFolder> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const folderRows = await queryUserFolderRows(userId);
  const existingDefault = folderRows.find((row) => row.is_default);

  if (existingDefault) {
    const defaultFolder = mapFolderRow(existingDefault, 0, true);
    await migrateNullFolderBookmarks(userId, defaultFolder.id);
    return defaultFolder;
  }

  const legacyDefault = folderRows.find(
    (row) => row.name === BOOKMARK_DEFAULT_STORAGE_NAME,
  );

  if (legacyDefault) {
    const { error: legacyUpdateError } = await supabase
      .from("bookmark_folders")
      .update({ is_default: true, sort_order: legacyDefault.sort_order ?? 0 })
      .eq("id", legacyDefault.id)
      .eq("user_id", userId);

    if (
      legacyUpdateError &&
      !isMissingFolderColumnError(legacyUpdateError.message)
    ) {
      console.error("[ensureDefaultBookmarkFolder] legacy update", legacyUpdateError.message);
    }

    const defaultFolder = mapFolderRow(legacyDefault, 0, true);
    await migrateNullFolderBookmarks(userId, defaultFolder.id);
    return defaultFolder;
  }

  const insertedRow = await insertDefaultBookmarkFolderRow(userId);
  const defaultFolder = mapFolderRow(insertedRow, 0, true);
  await migrateNullFolderBookmarks(userId, defaultFolder.id);
  return defaultFolder;
};

const fetchUserFolders = async (userId: string): Promise<BookmarkFolder[]> => {
  await ensureDefaultBookmarkFolder(userId);
  const folderRows = await queryUserFolderRows(userId);

  if (folderRows.some((row) => row.is_default)) {
    return folderRows.map((row, index) =>
      mapFolderRow(row, index, Boolean(row.is_default)),
    );
  }

  const defaultFolder = await ensureDefaultBookmarkFolder(userId);
  const refreshedRows = await queryUserFolderRows(userId);

  return refreshedRows.map((row, index) =>
    mapFolderRow(row, index, row.id === defaultFolder.id),
  );
};

const countCustomUserFolders = async (userId: string): Promise<number> => {
  const folders = await fetchUserFolders(userId);
  return folders.filter((folder) => !folder.isDefault).length;
};

const getDefaultFolderId = async (userId: string): Promise<string> => {
  const defaultFolder = await ensureDefaultBookmarkFolder(userId);
  return defaultFolder.id;
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

    const title = translateDocumentTitle(document.title ?? "제목 없음");
    const url = toPublicDocumentUrl(normalizeDocumentUrl(document.url));
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
          title,
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

export const createBookmarkFolder = async (
  userId: string,
  name: string,
): Promise<BookmarkFolder> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("폴더 이름을 입력해 주세요.");
  }

  if (getFolderNameLength(trimmedName) > MAX_BOOKMARK_FOLDER_NAME_LENGTH) {
    throw new Error(
      `폴더 이름은 ${MAX_BOOKMARK_FOLDER_NAME_LENGTH}자 이하로 입력해 주세요.`,
    );
  }

  const folderCount = await countCustomUserFolders(userId);

  if (folderCount >= MAX_BOOKMARK_FOLDER_COUNT) {
    throw new Error(
      `폴더는 최대 ${MAX_BOOKMARK_FOLDER_COUNT}개까지 만들 수 있습니다.`,
    );
  }

  const existingFolders = await fetchUserFolders(userId);
  const existingNames = existingFolders.map((folder) => folder.name);
  const uniqueName = resolveUniqueFolderName(trimmedName, existingNames);
  const nextSortOrder =
    existingFolders.reduce(
      (maxOrder, folder) => Math.max(maxOrder, folder.sortOrder),
      -1,
    ) + 1;

  const insertPayload: {
    user_id: string;
    name: string;
    sort_order?: number;
    is_default?: boolean;
  } = {
    user_id: userId,
    name: uniqueName,
    sort_order: nextSortOrder,
    is_default: false,
  };

  const { data, error } = await supabase
    .from("bookmark_folders")
    .insert(insertPayload)
    .select(FOLDER_SELECT_FULL)
    .single();

  if (error || !data) {
    if (isMissingFolderSortOrderError(error?.message ?? "")) {
      const legacyInsert = await supabase
        .from("bookmark_folders")
        .insert({
          user_id: userId,
          name: uniqueName,
        })
        .select("id, name, created_at")
        .single();

      if (legacyInsert.error || !legacyInsert.data) {
        console.error("[createBookmarkFolder]", legacyInsert.error?.message);
        throw new Error("폴더를 만들지 못했습니다.");
      }

      return mapFolderRow(
        legacyInsert.data as BookmarkFolderRow,
        folderCount,
        false,
      );
    }

    console.error("[createBookmarkFolder]", error?.message);
    throw new Error("폴더를 만들지 못했습니다.");
  }

  const folder = data as BookmarkFolderRow;

  return mapFolderRow(folder, folder.sort_order ?? folderCount, false);
};

const buildRenameStagingFolderName = (folderId: string): string => {
  const compactId = folderId.replace(/-/g, "").slice(0, 14);

  return `~${compactId}`;
};

const clearUserFolderDefaultFlags = async (
  userId: string,
): Promise<void> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { error } = await supabase
    .from("bookmark_folders")
    .update({ is_default: false })
    .eq("user_id", userId);

  if (error && !isMissingFolderIsDefaultError(error.message)) {
    console.error("[updateBookmarkFolders] clear defaults", error.message);
    throw new Error("폴더를 수정하지 못했습니다.");
  }
};

const stageFolderNamesForRename = async (
  userId: string,
  folderIds: string[],
): Promise<void> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  for (const folderId of folderIds) {
    const { error } = await supabase
      .from("bookmark_folders")
      .update({ name: buildRenameStagingFolderName(folderId) })
      .eq("id", folderId)
      .eq("user_id", userId);

    if (error) {
      console.error("[updateBookmarkFolders] stage rename", error.message);

      if (isUniqueViolationError(error.message)) {
        throw new Error("이미 사용 중인 폴더 이름입니다.");
      }

      throw new Error("폴더를 수정하지 못했습니다.");
    }
  }
};

const throwFolderUpdateError = (errorMessage: string): never => {
  if (isUniqueViolationError(errorMessage)) {
    throw new Error("이미 사용 중인 폴더 이름입니다.");
  }

  throw new Error("폴더를 수정하지 못했습니다.");
};

const applyFolderNameAndSortOrder = async (
  userId: string,
  update: {
    id: string;
    name: string;
    sort_order: number;
  },
): Promise<void> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { error: fullUpdateError } = await supabase
    .from("bookmark_folders")
    .update({
      name: update.name,
      sort_order: update.sort_order,
    })
    .eq("id", update.id)
    .eq("user_id", userId);

  if (!fullUpdateError) {
    return;
  }

  if (isMissingFolderSortOrderError(fullUpdateError.message)) {
    const { error: legacyUpdateError } = await supabase
      .from("bookmark_folders")
      .update({ name: update.name })
      .eq("id", update.id)
      .eq("user_id", userId);

    if (!legacyUpdateError) {
      return;
    }

    console.error("[updateBookmarkFolders] legacy name", legacyUpdateError.message);
    throwFolderUpdateError(legacyUpdateError.message);
  }

  console.error("[updateBookmarkFolders] name sort", fullUpdateError.message);
  throwFolderUpdateError(fullUpdateError.message);
};

const assignPinnedFolderFlag = async (
  userId: string,
  pinnedFolderId: string,
): Promise<void> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { error } = await supabase
    .from("bookmark_folders")
    .update({ is_default: true })
    .eq("id", pinnedFolderId)
    .eq("user_id", userId);

  if (!error) {
    return;
  }

  if (isMissingFolderIsDefaultError(error.message)) {
    return;
  }

  console.error("[updateBookmarkFolders] pin flag", error.message);

  if (isUniqueViolationError(error.message)) {
    throw new Error(`${BOOKMARK_PINNED_FOLDER_LABEL}를 지정하지 못했습니다.`);
  }

  throw new Error("폴더를 수정하지 못했습니다.");
};

export const updateBookmarkFolders = async (
  userId: string,
  folderDrafts: BookmarkFolderDraft[],
  deletedFolderIds: string[] = [],
): Promise<BookmarkFolder[]> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const existingFolders = await fetchUserFolders(userId);
  const existingIds = new Set(existingFolders.map((folder) => folder.id));

  const normalizedDeletedIds = [...new Set(deletedFolderIds)];

  if (
    existingFolders.length - normalizedDeletedIds.length !==
    folderDrafts.length
  ) {
    throw new Error("폴더 목록이 올바르지 않습니다.");
  }

  const trimmedNames = folderDrafts.map((folder) => folder.name.trim());

  if (trimmedNames.some((folderName) => !folderName)) {
    throw new Error("폴더 이름을 입력해 주세요.");
  }

  if (
    trimmedNames.some(
      (folderName) =>
        getFolderNameLength(folderName) > MAX_BOOKMARK_FOLDER_NAME_LENGTH,
    )
  ) {
    throw new Error(
      `폴더 이름은 ${MAX_BOOKMARK_FOLDER_NAME_LENGTH}자 이하로 입력해 주세요.`,
    );
  }

  const pinnedDrafts = folderDrafts.filter((folder) => folder.isDefault);

  if (pinnedDrafts.length !== 1) {
    throw new Error(`${BOOKMARK_PINNED_FOLDER_LABEL}는 1개만 지정할 수 있습니다.`);
  }

  const pinnedFolder = pinnedDrafts[0];

  if (!pinnedFolder) {
    throw new Error(`${BOOKMARK_PINNED_FOLDER_LABEL}를 찾을 수 없습니다.`);
  }

  if (normalizedDeletedIds.includes(pinnedFolder.id)) {
    throw new Error(`${BOOKMARK_PINNED_FOLDER_LABEL}는 삭제할 수 없습니다.`);
  }

  folderDrafts.forEach((folder) => {
    if (!existingIds.has(folder.id)) {
      throw new Error("수정할 수 없는 폴더가 포함되어 있습니다.");
    }
  });

  normalizedDeletedIds.forEach((folderId) => {
    if (!existingIds.has(folderId)) {
      throw new Error("삭제할 수 없는 폴더가 포함되어 있습니다.");
    }
  });

  for (const deletedFolderId of normalizedDeletedIds) {
    const { error: moveError } = await supabase
      .from("bookmarks")
      .update({ folder_id: pinnedFolder.id })
      .eq("user_id", userId)
      .eq("folder_id", deletedFolderId);

    if (moveError) {
      console.error("[updateBookmarkFolders] move", moveError.message);
      throw new Error("삭제할 폴더의 북마크를 옮기지 못했습니다.");
    }

    const { error: deleteError } = await supabase
      .from("bookmark_folders")
      .delete()
      .eq("id", deletedFolderId)
      .eq("user_id", userId)
      .eq("is_default", false);

    if (deleteError) {
      if (isMissingFolderIsDefaultError(deleteError.message)) {
        const { error: legacyDeleteError } = await supabase
          .from("bookmark_folders")
          .delete()
          .eq("id", deletedFolderId)
          .eq("user_id", userId)
          .neq("id", pinnedFolder.id);

        if (legacyDeleteError) {
          console.error("[updateBookmarkFolders] delete", legacyDeleteError.message);
          throw new Error("폴더를 삭제하지 못했습니다.");
        }

        continue;
      }

      console.error("[updateBookmarkFolders] delete", deleteError.message);
      throw new Error("폴더를 삭제하지 못했습니다.");
    }
  }

  const resolvedNames = resolveUniqueFolderNames(trimmedNames);

  const updates = folderDrafts.map((folder, index) => ({
    id: folder.id,
    name: resolvedNames[index] ?? folder.name.trim(),
    sort_order: index,
    is_default: folder.isDefault,
  }));

  // [ERROR FIX] 폴더명·고정 플래그를 한 번에 순차 업데이트하면 UNIQUE 제약 충돌
  // 1) is_default 전부 해제 → 2) 임시 이름 → 3) 이름·순서 저장 → 4) 고정 폴더만 is_default=true
  await clearUserFolderDefaultFlags(userId);
  await stageFolderNamesForRename(
    userId,
    updates.map((update) => update.id),
  );

  for (const update of updates) {
    await applyFolderNameAndSortOrder(userId, {
      id: update.id,
      name: update.name,
      sort_order: update.sort_order,
    });
  }

  await assignPinnedFolderFlag(userId, pinnedFolder.id);

  return fetchUserFolders(userId);
};

export const moveBookmarkToFolder = async (
  userId: string,
  documentId: string,
  folderId: string | null,
): Promise<void> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const targetFolderId = folderId ?? (await getDefaultFolderId(userId));

  const { data: folder, error: folderError } = await supabase
    .from("bookmark_folders")
    .select("id")
    .eq("id", targetFolderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (folderError || !folder) {
    throw new Error("폴더를 찾을 수 없습니다.");
  }

  const { error } = await supabase
    .from("bookmarks")
    .update({ folder_id: targetFolderId })
    .eq("user_id", userId)
    .eq("document_id", documentId);

  if (error) {
    console.error("[moveBookmarkToFolder]", error.message);
    throw new Error("북마크를 이동하지 못했습니다.");
  }
};

interface BookmarkStatusRow {
  id: string;
}

export const getDocumentBookmarkStatus = async (
  userId: string,
  documentId: string,
): Promise<DocumentBookmarkStatus> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("document_id", documentId)
    .maybeSingle();

  if (error) {
    console.error("[getDocumentBookmarkStatus]", error.message);
    throw new Error("북마크 상태를 확인하지 못했습니다.");
  }

  const bookmark = data as BookmarkStatusRow | null;

  return {
    isBookmarked: Boolean(bookmark),
    bookmarkId: bookmark?.id ?? null,
  };
};

export const addDocumentBookmark = async (
  userId: string,
  documentId: string,
): Promise<DocumentBookmarkStatus> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .maybeSingle();

  if (documentError || !document) {
    throw new Error("문서를 찾을 수 없습니다.");
  }

  const existing = await getDocumentBookmarkStatus(userId, documentId);
  if (existing.isBookmarked) {
    return existing;
  }

  const defaultFolderId = await getDefaultFolderId(userId);

  const { data, error } = await supabase
    .from("bookmarks")
    .insert({
      user_id: userId,
      document_id: documentId,
      folder_id: defaultFolderId,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[addDocumentBookmark]", error?.message);
    throw new Error("북마크 추가에 실패했습니다.");
  }

  return {
    isBookmarked: true,
    bookmarkId: data.id,
  };
};

export const removeDocumentBookmark = async (
  userId: string,
  documentId: string,
): Promise<DocumentBookmarkStatus> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", userId)
    .eq("document_id", documentId);

  if (error) {
    console.error("[removeDocumentBookmark]", error.message);
    throw new Error("북마크 삭제에 실패했습니다.");
  }

  return {
    isBookmarked: false,
    bookmarkId: null,
  };
};
