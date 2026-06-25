import {
  getDocumentUrlLookupPrefix,
  getPageKey,
  normalizeDocumentUrl,
} from "@/lib/document/normalize-document-url";
import { toPublicDocumentUrl } from "@/lib/document/text-document-url";
import { buildDocumentDisplayTitle } from "@/lib/translation/engine/translate-document-slug";
import { getTranslationDayRange } from "@/lib/translation/history/translation-day-range";
import { getSupabaseAdminClient } from "@/lib/supabase/supabase-admin";
import type { DocumentCodeBlock } from "@/types/document-code-block";
import type { DocumentImage } from "@/types/document-image";
import type { DocumentTranslationResult, KeywordTerm } from "@/types/translation";
import type { DocumentType } from "@/types/claude-document-translation";

interface SaveTranslationParams {
  userId: string;
  url: string;
  title: string;
  fullTitle?: string;
  originalContent: string;
  translatedSummaryContent: string;
  translatedFullContent: string;
  summaryTerms: KeywordTerm[];
  documentImages: DocumentImage[];
  documentCodeBlocks: DocumentCodeBlock[];
  documentType: DocumentType;
  warnings: string[];
}

export interface DocumentRow {
  id: string;
  title: string | null;
  url: string;
}

export const resolveDocumentRow = (
  documents: DocumentRow | DocumentRow[] | null,
): DocumentRow | null => {
  if (!documents) return null;
  return Array.isArray(documents) ? (documents[0] ?? null) : documents;
};

export const isMissingHistoryColumnError = (message: string): boolean => {
  const loweredMessage = message.toLowerCase();
  return (
    loweredMessage.includes("original_content") ||
    loweredMessage.includes("summary_terms") ||
    loweredMessage.includes("document_images") ||
    loweredMessage.includes("document_code_blocks") ||
    loweredMessage.includes("summary_content") ||
    loweredMessage.includes("full_content") ||
    loweredMessage.includes("document_type") ||
    loweredMessage.includes("translation_warnings")
  );
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
  fullTitle,
  originalContent,
  translatedSummaryContent,
  translatedFullContent,
  summaryTerms,
  documentImages,
  documentCodeBlocks,
  documentType,
  warnings,
}: SaveTranslationParams): Promise<DocumentTranslationResult> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되지 않았습니다.");
  }

  const canonicalUrl = normalizeDocumentUrl(url);
  const existingDocument = await findDocumentByPageKey(supabase, url);
  const translatedTitle = buildDocumentDisplayTitle(canonicalUrl, title);

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
    const summaryContent = translatedSummaryContent.trim() || translatedFullContent.trim();

    const payload = {
      user_id: userId,
      document_id: documentRow.id,
      content: summaryContent,
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
      summary_content: translatedSummaryContent,
      document_type: documentType,
      translation_warnings: warnings,
    },
    {
      summary_terms: summaryTerms,
      original_content: originalContent,
      document_images: documentImages,
      document_code_blocks: documentCodeBlocks,
      summary_content: translatedSummaryContent,
    },
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
    fullTitle: fullTitle ?? documentRow.title ?? translatedTitle,
    url: toPublicDocumentUrl(documentRow.url),
    originalContent,
    translatedSummaryContent,
    translatedFullContent,
    translatedContent: translatedSummaryContent,
    summaryTerms,
    documentImages,
    documentCodeBlocks,
    documentType,
    warnings,
    createdAt: translationRow.created_at,
  };
};

/** 생성된 전체 번역을 다음 조회부터 재사용할 수 있도록 캐시 — 실패해도 응답에는 영향 없음 */
export const persistFullTranslationContent = async (
  userId: string,
  translationId: string,
  fullContent: string,
): Promise<void> => {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from("translations")
    .update({ full_content: fullContent })
    .eq("id", translationId)
    .eq("user_id", userId);

  if (error && !isMissingHistoryColumnError(error.message)) {
    console.error("[persistFullTranslationContent]", error.message);
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
