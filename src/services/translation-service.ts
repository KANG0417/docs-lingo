import { processRefinedDocument } from "@/lib/translation/document-ai-processor";
import { refineDocumentFromText } from "@/lib/document-pipeline/refine-document-from-text";
import { refineDocumentFromUrl } from "@/lib/document-pipeline/refine-document";
import {
  getDocumentUrlLookupPrefix,
  getPageKey,
  isPaginationDocumentUrl,
  normalizeDocumentUrl,
} from "@/lib/document/normalize-document-url";
import { toPublicDocumentUrl } from "@/lib/document/text-document-url";
import { parseStoredDocumentImages } from "@/lib/document/parse-document-images";
import { buildTranslationHistorySummary } from "@/lib/translation/build-history-summary";
import { translateDocumentTitle } from "@/lib/translation/translate-document-title";
import { rehydrateDocumentImagesFromUrl } from "@/lib/translation/rehydrate-translation-images";
import { shouldPersistTranslation } from "@/lib/translation/should-persist-translation";
import { getTranslationDayRange } from "@/lib/translation/translation-day-range";
import {
  getHistoryMinDateKey,
  isValidHistoryDateKey,
} from "@/lib/translation/translation-history-date";
import { HISTORY_PAGE_SIZE } from "@/constants/translation-history";
import {
  TranslationError,
  toTranslationError,
} from "@/lib/translation/translation-errors";
import { ensureUserProfileExists } from "@/services/profile-service";
import { generateTextDocumentTitle } from "@/lib/translation/generate-text-document-title";
import { getUserAiCredentials } from "@/services/ai-settings-service";
import { getSupabaseAdminClient } from "@/lib/supabase/supabase-admin";
import type { DocumentCodeBlock } from "@/types/document-code-block";
import type { DocumentImage } from "@/types/document-image";
import type {
  DocumentTranslationResult,
  KeywordTerm,
  TranslationHistoryItem,
  TranslationHistoryQuery,
  TranslationHistoryResponse,
} from "@/types/translation";

interface SaveTranslationParams {
  userId: string;
  url: string;
  title: string;
  originalContent: string;
  translatedContent: string;
  summaryTerms: KeywordTerm[];
  documentImages: DocumentImage[];
  documentCodeBlocks: DocumentCodeBlock[];
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
  documents: DocumentRow | DocumentRow[] | null;
}

const resolveDocumentRow = (
  documents: DocumentRow | DocumentRow[] | null,
): DocumentRow | null => {
  if (!documents) return null;
  return Array.isArray(documents) ? (documents[0] ?? null) : documents;
};

const mapHistoryItem = (row: TranslationRow): TranslationHistoryItem => {
  const document = resolveDocumentRow(row.documents);
  const title = translateDocumentTitle(document?.title ?? "제목 없음");
  const url = document?.url
    ? toPublicDocumentUrl(normalizeDocumentUrl(document.url))
    : null;
  const summaryTerms = row.summary_terms ?? [];

  return {
    id: row.id,
    documentId: row.document_id,
    title,
    url,
    historySummary: buildTranslationHistorySummary({
      title,
      url,
      summaryTerms,
    }),
    originalContent: row.original_content,
    translatedContent: row.content,
    summaryTerms,
    documentImages: parseStoredDocumentImages(row.document_images),
    documentCodeBlocks: row.document_code_blocks ?? [],
    createdAt: row.created_at,
  };
};

const isValidHistoryItem = (item: TranslationHistoryItem): boolean => {
  if (!item.translatedContent.trim()) {
    return false;
  }

  if (!item.originalContent) {
    return true;
  }

  return shouldPersistTranslation(item.originalContent, item.translatedContent);
};

const dedupeHistoryByPageKey = (
  items: TranslationHistoryItem[],
): TranslationHistoryItem[] => {
  const seen = new Map<string, TranslationHistoryItem>();

  items.forEach((item) => {
    const dedupeKey = item.url ? (getPageKey(item.url) ?? item.url) : item.id;

    if (!seen.has(dedupeKey)) {
      seen.set(dedupeKey, item);
    }
  });

  return [...seen.values()];
};

const findDocumentByPageKey = async (
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  rawUrl: string,
): Promise<DocumentRow | null> => {
  const pageKey = getPageKey(rawUrl);
  const lookupPrefix = getDocumentUrlLookupPrefix(rawUrl);

  if (!pageKey || !lookupPrefix) {
    return null;
  }

  const { data, error } = await supabase
    .from("documents")
    .select("id, title, url")
    .like("url", `${lookupPrefix}%`);

  if (error || !data?.length) {
    return null;
  }

  return data.find((row) => getPageKey(row.url) === pageKey) ?? null;
};

export const saveTranslation = async ({
  userId,
  url,
  title,
  originalContent,
  translatedContent,
  summaryTerms,
  documentImages,
  documentCodeBlocks,
}: SaveTranslationParams): Promise<DocumentTranslationResult> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const canonicalUrl = normalizeDocumentUrl(url);
  const existingDocument = await findDocumentByPageKey(supabase, url);
  const translatedTitle = translateDocumentTitle(title);

  let documentRow: DocumentRow | null = null;

  if (existingDocument) {
    const { data, error } = await supabase
      .from("documents")
      .update({
        url: canonicalUrl,
        title: translatedTitle,
      })
      .eq("id", existingDocument.id)
      .select("id, title, url")
      .single();

    if (error) {
      console.error("[saveTranslation] document update", error.message);
    } else {
      documentRow = data;
    }
  }

  if (!documentRow) {
    const { data, error: documentError } = await supabase
      .from("documents")
      .upsert(
        {
          url: canonicalUrl,
          title: translatedTitle,
        },
        { onConflict: "url" },
      )
      .select("id, title, url")
      .single();

    if (documentError || !data) {
      console.error("[saveTranslation] document", documentError?.message);
      throw new Error("문서 저장에 실패했습니다.");
    }

    documentRow = data;
  }

  const { startIso, endIso } = getTranslationDayRange();

  const { data: existingTodayTranslation } = await supabase
    .from("translations")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("document_id", documentRow.id)
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const persistTranslation = async (
    extendedPayload: Record<string, unknown>,
  ): Promise<{ id: string; created_at: string } | null> => {
    const payload = {
      user_id: userId,
      document_id: documentRow.id,
      content: translatedContent,
      source_lang: "en",
      target_lang: "ko",
      ...extendedPayload,
    };

    if (existingTodayTranslation) {
      const { data, error } = await supabase
        .from("translations")
        .update(payload)
        .eq("id", existingTodayTranslation.id)
        .select("id, created_at")
        .single();

      if (error) {
        console.error("[saveTranslation] translation update", error.message);
        return null;
      }

      return data;
    }

    const { data, error } = await supabase
      .from("translations")
      .insert(payload)
      .select("id, created_at")
      .single();

    if (error) {
      console.error("[saveTranslation] translation insert", error.message);
      return null;
    }

    return data;
  };

  const extendedPayloadAttempts: Record<string, unknown>[] = [
    {
      summary_terms: summaryTerms,
      original_content: originalContent,
      document_images: documentImages,
      document_code_blocks: documentCodeBlocks,
    },
    {
      summary_terms: summaryTerms,
      original_content: originalContent,
      document_images: documentImages,
    },
    {
      summary_terms: summaryTerms,
      original_content: originalContent,
    },
    {},
  ];

  let translationRow: { id: string; created_at: string } | null = null;

  for (const extendedPayload of extendedPayloadAttempts) {
    translationRow = await persistTranslation(extendedPayload);

    if (translationRow) {
      break;
    }
  }

  if (!translationRow) {
    throw new Error(
      "번역 히스토리 저장에 실패했습니다.\nSupabase SQL Editor에서 supabase/migrations/20260610-translations-history.sql 을 실행해 주세요.",
    );
  }

  return {
    id: translationRow.id,
    documentId: documentRow.id,
    title: documentRow.title ?? translatedTitle,
    url: toPublicDocumentUrl(documentRow.url),
    originalContent,
    translatedContent,
    summaryTerms,
    documentImages,
    documentCodeBlocks,
    createdAt: translationRow.created_at,
  };
};

const buildLocalTranslationResult = (
  localId: string,
  refinedDocument: {
    title: string;
    url: string;
    originalContent: string;
  },
  processedDocument: {
    translatedContent: string;
    summaryTerms: KeywordTerm[];
    documentImages: DocumentImage[];
    documentCodeBlocks: DocumentCodeBlock[];
  },
): DocumentTranslationResult => {
  return {
    id: localId,
    documentId: localId,
    title: translateDocumentTitle(refinedDocument.title),
    url: toPublicDocumentUrl(refinedDocument.url),
    originalContent: refinedDocument.originalContent,
    translatedContent: processedDocument.translatedContent,
    summaryTerms: processedDocument.summaryTerms,
    documentImages: processedDocument.documentImages,
    documentCodeBlocks: processedDocument.documentCodeBlocks,
    createdAt: new Date().toISOString(),
  };
};

const translateRefinedDocument = async (
  userId: string,
  refinedDocument: {
    title: string;
    url: string;
    originalContent: string;
    aiInput: string;
    documentImages: DocumentImage[];
    documentCodeBlocks: DocumentCodeBlock[];
  },
): Promise<DocumentTranslationResult> => {
  const userAiCredentials = await getUserAiCredentials(userId);

  let processedDocument: Awaited<ReturnType<typeof processRefinedDocument>>;

  try {
    processedDocument = await processRefinedDocument(
      refinedDocument.title,
      refinedDocument.originalContent,
      refinedDocument.aiInput,
      refinedDocument.documentImages,
      refinedDocument.documentCodeBlocks,
      userAiCredentials,
    );
  } catch (error) {
    throw toTranslationError(error);
  }

  const { translatedContent, summaryTerms, documentImages, documentCodeBlocks } =
    processedDocument;

  if (!translatedContent.trim()) {
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

  if (
    !shouldPersistTranslation(
      refinedDocument.originalContent,
      translatedContent,
    )
  ) {
    return buildLocalTranslationResult(
      "local-untranslated",
      refinedDocument,
      processedDocument,
    );
  }

  return saveTranslation({
    userId,
    url: refinedDocument.url,
    title: refinedDocument.title,
    originalContent: refinedDocument.originalContent,
    translatedContent,
    summaryTerms,
    documentImages,
    documentCodeBlocks,
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

const HISTORY_SELECT_FULL =
  "id, document_id, content, original_content, summary_terms, document_images, document_code_blocks, created_at, documents(id, title, url)";

const HISTORY_SELECT_LEGACY =
  "id, document_id, content, created_at, documents(id, title, url)";

const isMissingHistoryColumnError = (message: string): boolean => {
  const loweredMessage = message.toLowerCase();
  return (
    loweredMessage.includes("original_content") ||
    loweredMessage.includes("summary_terms") ||
    loweredMessage.includes("document_images") ||
    loweredMessage.includes("document_code_blocks")
  );
};

const fetchHistoryRows = async (
  userId: string,
  selectClause: string,
  dateKey: string,
  page: number,
  pageSize: number,
): Promise<{ rows: TranslationRow[]; totalCount: number }> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { startIso, endIso } = getTranslationDayRange(
    new Date(`${dateKey}T12:00:00+09:00`),
  );
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const countQuery = await supabase
    .from("translations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  if (countQuery.error) {
    throw new Error(countQuery.error.message);
  }

  const dataQuery = await supabase
    .from("translations")
    .select(selectClause)
    .eq("user_id", userId)
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (dataQuery.error) {
    throw new Error(dataQuery.error.message);
  }

  return {
    rows: (dataQuery.data ?? []) as unknown as TranslationRow[],
    totalCount: countQuery.count ?? 0,
  };
};

export const getTranslationHistory = async (
  userId: string,
  query: TranslationHistoryQuery = {},
): Promise<TranslationHistoryResponse> => {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? HISTORY_PAGE_SIZE);
  const dateKey =
    query.dateKey && isValidHistoryDateKey(query.dateKey)
      ? query.dateKey
      : getTranslationDayRange().dateKey;

  try {
    const fullResult = await fetchHistoryRows(
      userId,
      HISTORY_SELECT_FULL,
      dateKey,
      page,
      pageSize,
    );

    const totalPages = Math.max(1, Math.ceil(fullResult.totalCount / pageSize));

    return {
      items: dedupeHistoryByPageKey(
        fullResult.rows.map(mapHistoryItem).filter(isValidHistoryItem),
      ),
      totalCount: fullResult.totalCount,
      page,
      pageSize,
      totalPages,
      dateKey,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (!isMissingHistoryColumnError(message)) {
      console.error("[getTranslationHistory]", message);
      throw new Error(message || "번역 히스토리를 불러오지 못했습니다.");
    }
  }

  try {
    const legacyResult = await fetchHistoryRows(
      userId,
      HISTORY_SELECT_LEGACY,
      dateKey,
      page,
      pageSize,
    );

    const totalPages = Math.max(1, Math.ceil(legacyResult.totalCount / pageSize));

    return {
      items: dedupeHistoryByPageKey(
        legacyResult.rows
          .map((row) =>
            mapHistoryItem({
              ...row,
              original_content: null,
              summary_terms: [],
              document_images: [],
              document_code_blocks: [],
            } as TranslationRow),
          )
          .filter(isValidHistoryItem),
      ),
      totalCount: legacyResult.totalCount,
      page,
      pageSize,
      totalPages,
      dateKey,
    };
  } catch (legacyError) {
    const legacyMessage =
      legacyError instanceof Error ? legacyError.message : "";

    throw new Error(
      legacyMessage ||
        "번역 히스토리 테이블 마이그레이션이 필요합니다.\nSupabase SQL Editor에서 supabase/migrations/20260610-translations-history.sql 을 실행해 주세요.",
    );
  }
};

export const getTranslationHistoryDateKeys = async (
  userId: string,
): Promise<string[]> => {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const minDateKey = getHistoryMinDateKey();
  const todayRange = getTranslationDayRange();
  const startIso = `${minDateKey}T00:00:00+09:00`;

  const { data, error } = await supabase
    .from("translations")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", startIso)
    .lte("created_at", todayRange.endIso);

  if (error) {
    console.error("[getTranslationHistoryDateKeys]", error.message);
    throw new Error("번역 히스토리 날짜를 불러오지 못했습니다.");
  }

  const dateKeys = new Set<string>();

  (data ?? []).forEach((row) => {
    const dateKey = getTranslationDayRange(new Date(row.created_at)).dateKey;

    if (isValidHistoryDateKey(dateKey)) {
      dateKeys.add(dateKey);
    }
  });

  return [...dateKeys].sort((left, right) => right.localeCompare(left));
};

const fetchTranslationRowById = async (
  userId: string,
  translationId: string,
  selectClause: string,
): Promise<TranslationRow | null> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("translations")
    .select(selectClause)
    .eq("user_id", userId)
    .eq("id", translationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as TranslationRow) ?? null;
};

const mapLegacyTranslationRow = (row: TranslationRow): TranslationHistoryItem => {
  return mapHistoryItem({
    ...row,
    original_content: null,
    summary_terms: [],
    document_images: [],
    document_code_blocks: [],
  } as TranslationRow);
};

const enrichTranslationImages = async (
  userId: string,
  item: TranslationHistoryItem,
): Promise<TranslationHistoryItem> => {
  if (item.documentImages.length > 0 || !item.url) {
    return item;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return item;
  }

  try {
    const rehydratedImages = await rehydrateDocumentImagesFromUrl(item.url);

    if (rehydratedImages.length === 0) {
      return item;
    }

    const { error: updateError } = await supabase
      .from("translations")
      .update({ document_images: rehydratedImages })
      .eq("id", item.id)
      .eq("user_id", userId);

    if (updateError) {
      console.error("[enrichTranslationImages] backfill", updateError.message);
    }

    return {
      ...item,
      documentImages: rehydratedImages,
    };
  } catch (rehydrateError) {
    console.error("[enrichTranslationImages] rehydrate", rehydrateError);
    return item;
  }
};

export const getTranslationById = async (
  userId: string,
  translationId: string,
): Promise<TranslationHistoryItem | null> => {
  try {
    const row = await fetchTranslationRowById(
      userId,
      translationId,
      HISTORY_SELECT_FULL,
    );

    if (!row) {
      return null;
    }

    return enrichTranslationImages(userId, mapHistoryItem(row));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (!isMissingHistoryColumnError(message)) {
      console.error("[getTranslationById]", message);
      return null;
    }
  }

  try {
    const row = await fetchTranslationRowById(
      userId,
      translationId,
      HISTORY_SELECT_LEGACY,
    );

    if (!row) {
      return null;
    }

    return enrichTranslationImages(userId, mapLegacyTranslationRow(row));
  } catch (legacyError) {
    const message =
      legacyError instanceof Error ? legacyError.message : "";

    console.error("[getTranslationById] legacy", message);
    return null;
  }
};

export const deleteTranslation = async (
  userId: string,
  translationId: string,
): Promise<void> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { data: target, error: fetchError } = await supabase
    .from("translations")
    .select("id, document_id, created_at, documents(id, url)")
    .eq("id", translationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    console.error("[deleteTranslation] fetch", fetchError.message);
    throw new Error("번역 히스토리 삭제에 실패했습니다.");
  }

  if (!target) {
    throw new Error("삭제할 번역 기록을 찾지 못했습니다.");
  }

  const targetDocument = resolveDocumentRow(
    target.documents as DocumentRow | DocumentRow[] | null,
  );
  const pageKey = targetDocument?.url ? getPageKey(targetDocument.url) : null;
  const translationIdsToDelete = new Set<string>([translationId]);

  if (pageKey && target.created_at) {
    const { startIso, endIso } = getTranslationDayRange(
      new Date(target.created_at),
    );

    const { data: dayTranslations, error: dayFetchError } = await supabase
      .from("translations")
      .select("id, documents(url)")
      .eq("user_id", userId)
      .gte("created_at", startIso)
      .lte("created_at", endIso);

    if (dayFetchError) {
      console.error("[deleteTranslation] day fetch", dayFetchError.message);
      throw new Error("번역 히스토리 삭제에 실패했습니다.");
    }

    dayTranslations?.forEach((row) => {
      const document = resolveDocumentRow(
        row.documents as DocumentRow | DocumentRow[] | null,
      );

      if (document?.url && getPageKey(document.url) === pageKey) {
        translationIdsToDelete.add(row.id);
      }
    });
  }

  const { data: deletedRows, error: deleteError } = await supabase
    .from("translations")
    .delete()
    .eq("user_id", userId)
    .in("id", [...translationIdsToDelete])
    .select("id, document_id");

  if (deleteError) {
    console.error("[deleteTranslation]", deleteError.message);
    throw new Error("번역 히스토리 삭제에 실패했습니다.");
  }

  if (!deletedRows?.length) {
    throw new Error("삭제할 번역 기록을 찾지 못했습니다.");
  }

  const affectedDocumentIds = [
    ...new Set(deletedRows.map((row) => row.document_id)),
  ];

  await Promise.all(
    affectedDocumentIds.map(async (documentId) => {
      const { count: translationCount, error: translationCountError } =
        await supabase
          .from("translations")
          .select("id", { count: "exact", head: true })
          .eq("document_id", documentId);

      if (translationCountError) {
        console.error(
          "[deleteTranslation] translation count",
          translationCountError.message,
        );
        return;
      }

      if ((translationCount ?? 0) > 0) {
        return;
      }

      const { count: bookmarkCount, error: bookmarkCountError } = await supabase
        .from("bookmarks")
        .select("id", { count: "exact", head: true })
        .eq("document_id", documentId);

      if (bookmarkCountError) {
        console.error(
          "[deleteTranslation] bookmark count",
          bookmarkCountError.message,
        );
        return;
      }

      if ((bookmarkCount ?? 0) > 0) {
        return;
      }

      const { error: documentDeleteError } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);

      if (documentDeleteError) {
        console.error(
          "[deleteTranslation] document delete",
          documentDeleteError.message,
        );
      }
    }),
  );
};
