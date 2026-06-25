import {
  getPageKey,
  normalizeDocumentUrl,
} from "@/lib/document/normalize-document-url";
import { toPublicDocumentUrl } from "@/lib/document/text-document-url";
import { parseStoredDocumentImages } from "@/lib/document/parse-document-images";
import { buildTranslationHistorySummary } from "@/lib/translation/history/build-history-summary";
import { resolveTranslationContents } from "@/lib/translation/resolve-translation-contents";
import { buildDocumentDisplayTitle } from "@/lib/translation/engine/translate-document-slug";
import { rehydrateDocumentImagesFromUrl } from "@/lib/translation/rehydrate-translation-images";
import { shouldPersistTranslation } from "@/lib/translation/should-persist-translation";
import { getTranslationDayRange } from "@/lib/translation/history/translation-day-range";
import {
  getHistoryMinDateKey,
  isValidHistoryDateKey,
} from "@/lib/translation/history/translation-history-date";
import { HISTORY_PAGE_SIZE } from "@/constants/translation-history";
import { paginateHistoryItems } from "@/lib/translation/history/history-pagination-utils";
import { getSupabaseAdminClient } from "@/lib/supabase/supabase-admin";
import {
  isMissingHistoryColumnError,
  resolveDocumentRow,
  type DocumentRow,
} from "@/services/translation/translation-persistence-service";
import type { DocumentImage } from "@/types/document-image";
import type { DocumentCodeBlock } from "@/types/document-code-block";
import type {
  KeywordTerm,
  TranslationHistoryItem,
  TranslationHistoryQuery,
  TranslationHistoryResponse,
} from "@/types/translation";
import type { DocumentType } from "@/types/claude-document-translation";

interface TranslationRow {
  id: string;
  document_id: string;
  content: string;
  summary_content: string | null;
  full_content: string | null;
  original_content: string | null;
  summary_terms: KeywordTerm[] | null;
  document_images: DocumentImage[] | null;
  document_code_blocks: DocumentCodeBlock[] | null;
  document_type: DocumentType | null;
  translation_warnings: string[] | null;
  created_at: string;
  documents: DocumentRow | DocumentRow[] | null;
}

const mapHistoryItem = (row: TranslationRow): TranslationHistoryItem => {
  const document = resolveDocumentRow(row.documents);
  const url = document?.url
    ? toPublicDocumentUrl(normalizeDocumentUrl(document.url))
    : null;
  const title = buildDocumentDisplayTitle(url, document?.title ?? "제목 없음");
  const summaryTerms = row.summary_terms ?? [];
  const {
    translatedSummaryContent,
    translatedFullContent,
  } = resolveTranslationContents(
    row.content,
    row.summary_content,
    row.full_content,
  );

  return {
    id: row.id,
    documentId: row.document_id,
    title,
    fullTitle: title,
    url,
    historySummary: buildTranslationHistorySummary({
      title: document?.title ?? "제목 없음",
      url,
      summaryTerms,
    }),
    originalContent: row.original_content,
    translatedSummaryContent,
    translatedFullContent,
    translatedContent: translatedSummaryContent,
    summaryTerms,
    documentImages: parseStoredDocumentImages(row.document_images),
    documentCodeBlocks: row.document_code_blocks ?? [],
    documentType: row.document_type ?? "other",
    warnings: row.translation_warnings ?? [],
    createdAt: row.created_at,
  };
};

const isValidHistoryItem = (item: TranslationHistoryItem): boolean => {
  const summaryContent =
    item.translatedSummaryContent.trim() || item.translatedFullContent.trim();

  if (!summaryContent) {
    return false;
  }

  if (!item.originalContent) {
    return true;
  }

  return shouldPersistTranslation(item.originalContent, summaryContent);
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

const buildHistoryResponse = (
  rows: TranslationRow[],
  dateKey: string,
  page: number,
  pageSize: number,
): TranslationHistoryResponse => {
  const dedupedItems = dedupeHistoryByPageKey(
    rows.map(mapHistoryItem).filter(isValidHistoryItem),
  );
  const paginated = paginateHistoryItems(dedupedItems, page, pageSize);

  return {
    items: paginated.items,
    totalCount: paginated.totalCount,
    page: paginated.page,
    pageSize: paginated.pageSize,
    totalPages: paginated.totalPages,
    dateKey,
  };
};

const buildLegacyHistoryResponse = (
  rows: TranslationRow[],
  dateKey: string,
  page: number,
  pageSize: number,
): TranslationHistoryResponse => {
  const dedupedItems = dedupeHistoryByPageKey(
    rows
      .map((row) =>
        mapHistoryItem({
          ...row,
          summary_content: null,
          full_content: null,
          original_content: null,
          summary_terms: [],
          document_images: [],
          document_code_blocks: [],
        } as TranslationRow),
      )
      .filter(isValidHistoryItem),
  );
  const paginated = paginateHistoryItems(dedupedItems, page, pageSize);

  return {
    items: paginated.items,
    totalCount: paginated.totalCount,
    page: paginated.page,
    pageSize: paginated.pageSize,
    totalPages: paginated.totalPages,
    dateKey,
  };
};

const HISTORY_SELECT_FULL =
  "id, document_id, content, summary_content, full_content, original_content, summary_terms, document_images, document_code_blocks, document_type, translation_warnings, created_at, documents(id, title, url)";

const HISTORY_SELECT_LEGACY =
  "id, document_id, content, created_at, documents(id, title, url)";

const fetchAllHistoryRowsForDate = async (
  userId: string,
  selectClause: string,
  dateKey: string,
): Promise<TranslationRow[]> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const { startIso, endIso } = getTranslationDayRange(
    new Date(`${dateKey}T12:00:00+09:00`),
  );

  const dataQuery = await supabase
    .from("translations")
    .select(selectClause)
    .eq("user_id", userId)
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .order("created_at", { ascending: false });

  if (dataQuery.error) {
    throw new Error(dataQuery.error.message);
  }

  return (dataQuery.data ?? []) as unknown as TranslationRow[];
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
    const rows = await fetchAllHistoryRowsForDate(
      userId,
      HISTORY_SELECT_FULL,
      dateKey,
    );

    return buildHistoryResponse(rows, dateKey, page, pageSize);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (!isMissingHistoryColumnError(message)) {
      console.error("[getTranslationHistory]", message);
      throw new Error(message || "번역 히스토리를 불러오지 못했습니다.");
    }
  }

  try {
    const rows = await fetchAllHistoryRowsForDate(
      userId,
      HISTORY_SELECT_LEGACY,
      dateKey,
    );

    return buildLegacyHistoryResponse(rows, dateKey, page, pageSize);
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
    summary_content: null,
    full_content: null,
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

interface FullTranslationSourceRow {
  original_content: string | null;
  full_content: string | null;
}

export interface FullTranslationSource {
  originalContent: string;
  cachedFullContent: string | null;
}

/** 전체 번역 탭을 처음 누를 때 필요한 원문과, 이미 생성돼 캐시된 번역이 있는지 조회 */
export const getFullTranslationSource = async (
  userId: string,
  translationId: string,
): Promise<FullTranslationSource | null> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("translations")
    .select("original_content, full_content")
    .eq("id", translationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as FullTranslationSourceRow;
  const originalContent = row.original_content?.trim() ?? "";

  if (!originalContent) {
    return null;
  }

  return {
    originalContent,
    cachedFullContent: row.full_content?.trim() || null,
  };
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
