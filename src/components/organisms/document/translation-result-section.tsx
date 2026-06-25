"use client";

import clsx from "clsx";
import { useState, type ReactElement } from "react";
import { HighlightedTranslationContent } from "@/components/molecules/document/highlighted-translation-content";
import { TranslationBookmarkButton } from "@/components/molecules/document/translation-bookmark-button";
import { TranslationWarnings } from "@/components/molecules/document/translation-warnings";
import { DocumentTypeBadge } from "@/components/atoms/badge/document-type-badge";
import { useFullTranslation } from "@/hooks/use-full-translation";
import type { DocumentTranslationResult } from "@/types/translation";

interface TranslationResultSectionProps {
  result: DocumentTranslationResult;
  isMemoTilted?: boolean;
  onClose?: () => void;
}

type TranslationViewTab = "summary" | "full";

const isBookmarkableTranslation = (translationId: string): boolean => {
  return (
    translationId !== "local-text" &&
    translationId !== "local-pagination" &&
    translationId !== "local-untranslated"
  );
};

/**
 * result.id로 key를 줘서 결과가 바뀌면 새로 마운트되게 한다 — 탭 상태와
 * 전체 번역 캐시를 effect 없이 자연스럽게 초기화하기 위함.
 */
const TranslationContentTabs = ({
  result,
}: {
  result: DocumentTranslationResult;
}): ReactElement => {
  const [activeTab, setActiveTab] = useState<TranslationViewTab>("summary");
  const fullTranslation = useFullTranslation();
  const displayedSummaryContent =
    result.translatedSummaryContent.trim() ||
    result.translatedFullContent.trim();

  const handleSelectFullTab = (): void => {
    setActiveTab("full");
    void fullTranslation.ensureFullTranslation(result.id, result.originalContent);
  };

  return (
    <section className="mt-5" aria-labelledby="translation-content-heading">
      <div
        className="mb-4 flex gap-2"
        role="tablist"
        aria-label="번역 결과 보기 방식"
      >
        <button
          type="button"
          role="tab"
          id="translation-content-heading"
          aria-selected={activeTab === "summary"}
          onClick={() => setActiveTab("summary")}
          className={clsx(
            "font-doc-translation-bold rounded-md px-3 py-1 text-sm font-bold transition-colors",
            activeTab === "summary"
              ? "bg-amber-900 text-white"
              : "bg-amber-100 text-amber-900 hover:bg-amber-200",
          )}
        >
          핵심 요약
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "full"}
          onClick={handleSelectFullTab}
          className={clsx(
            "font-doc-translation-bold rounded-md px-3 py-1 text-sm font-bold transition-colors",
            activeTab === "full"
              ? "bg-amber-900 text-white"
              : "bg-amber-100 text-amber-900 hover:bg-amber-200",
          )}
        >
          전체 번역
        </button>
      </div>

      {activeTab === "summary" ? (
        <HighlightedTranslationContent
          content={displayedSummaryContent}
          summaryTerms={result.summaryTerms}
          documentImages={result.documentImages}
          documentCodeBlocks={result.documentCodeBlocks}
          baseUrl={result.url ?? undefined}
        />
      ) : fullTranslation.isLoading ? (
        <p className="font-doc-aux text-sm text-zinc-500">
          전체 번역을 생성하는 중입니다...
        </p>
      ) : fullTranslation.errorMessage ? (
        <p className="font-doc-aux text-sm text-rose-600">
          {fullTranslation.errorMessage}
        </p>
      ) : (
        <HighlightedTranslationContent
          content={fullTranslation.content ?? ""}
          summaryTerms={result.summaryTerms}
          documentImages={result.documentImages}
          documentCodeBlocks={result.documentCodeBlocks}
          emphasizeImportancePhrases
          sectionMode="full"
          baseUrl={result.url ?? undefined}
        />
      )}
    </section>
  );
};

export const TranslationResultSection = ({
  result,
  isMemoTilted = false,
  onClose,
}: TranslationResultSectionProps): ReactElement => {
  const isBookmarkable = isBookmarkableTranslation(result.id);
  const displayTitle = result.fullTitle?.trim() || result.title;

  return (
    <article
      className={clsx(
        "translation-result relative w-full",
        isMemoTilted && "doc-reader-result-memo-tilt",
      )}
    >
      <span
        aria-hidden="true"
        className="absolute -top-2.5 left-6 z-10 h-5 w-16 -rotate-6 rounded-[2px] bg-violet-200/40 shadow-sm backdrop-blur-sm"
      />
      <span
        aria-hidden="true"
        className="absolute -top-2.5 right-6 z-10 h-5 w-16 rotate-6 rounded-[2px] bg-indigo-200/40 shadow-sm backdrop-blur-sm"
      />

      <div className="memo-lines rounded-sm border border-amber-200 bg-amber-50 shadow-[4px_8px_24px_rgba(0,0,0,0.45)]">
        <header className="flex items-start justify-between gap-4 border-b border-dashed border-amber-300 pb-4">
          <div className="min-w-0 flex-1">
            {result.url ? (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`${displayTitle} — 원문 페이지 열기`}
                className="translation-result-title-link font-doc-translation-bold text-lg font-bold"
              >
                {displayTitle}
              </a>
            ) : (
              <h2 className="font-doc-translation-bold text-lg font-bold text-zinc-900">
                {displayTitle}
              </h2>
            )}
            <div className="mt-2">
              <DocumentTypeBadge documentType={result.documentType} />
            </div>
          </div>

          <div className="flex shrink-0 items-start gap-2">
            <TranslationBookmarkButton
              documentId={result.documentId}
              documentTitle={displayTitle}
              isBookmarkable={isBookmarkable}
            />
            {onClose && (
              <button
                type="button"
                aria-label="번역 결과 닫기"
                title="번역 결과 닫기"
                onClick={onClose}
                className="bookmark-reader-close-btn font-doc-aux"
              >
                ×
              </button>
            )}
          </div>
        </header>

        <TranslationWarnings warnings={result.warnings} />

        <TranslationContentTabs key={result.id} result={result} />
      </div>
    </article>
  );
};
