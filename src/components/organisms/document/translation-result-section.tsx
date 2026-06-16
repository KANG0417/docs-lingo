import clsx from "clsx";
import type { ReactElement } from "react";
import { HighlightedTranslationContent } from "@/components/molecules/document/highlighted-translation-content";
import { KeywordSummary } from "@/components/molecules/document/keyword-summary";
import { TranslationBookmarkButton } from "@/components/molecules/document/translation-bookmark-button";
import type { DocumentTranslationResult } from "@/types/translation";

interface TranslationResultSectionProps {
  result: DocumentTranslationResult;
  isMemoTilted?: boolean;
  showTranslationResultLabel?: boolean;
  onClose?: () => void;
}

const isBookmarkableTranslation = (translationId: string): boolean => {
  return (
    translationId !== "local-text" &&
    translationId !== "local-pagination" &&
    translationId !== "local-untranslated"
  );
};

export const TranslationResultSection = ({
  result,
  isMemoTilted = false,
  showTranslationResultLabel = true,
  onClose,
}: TranslationResultSectionProps): ReactElement => {
  const isBookmarkable = isBookmarkableTranslation(result.id);

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
                title={`${result.title} — 원문 페이지 열기`}
                className="translation-result-title-link font-doc-translation-bold text-lg font-bold"
              >
                {result.title}
              </a>
            ) : (
              <h2 className="font-doc-translation-bold text-lg font-bold text-zinc-900">
                {result.title}
              </h2>
            )}
          </div>

          <div className="flex shrink-0 items-start gap-2">
            <TranslationBookmarkButton
              documentId={result.documentId}
              documentTitle={result.title}
              isBookmarkable={isBookmarkable}
            />
            {onClose && (
              <button
                type="button"
                aria-label="문서 닫기"
                title="닫기"
                onClick={onClose}
                className="bookmark-reader-close-btn font-doc-aux"
              >
                ×
              </button>
            )}
          </div>
        </header>

        {result.summaryTerms.length > 0 && (
          <section className="mt-5 border-b border-dashed border-amber-300 pb-5">
            <h3 className="font-doc-translation-bold mb-3 text-sm font-bold text-amber-900">
              핵심 키워드 요약
            </h3>
            <KeywordSummary summaryTerms={result.summaryTerms} />
          </section>
        )}

        <section className="mt-5">
          {showTranslationResultLabel && (
            <h3 className="font-doc-translation-bold mb-3 text-sm font-bold text-amber-900">
              번역 결과
            </h3>
          )}
          <HighlightedTranslationContent
            content={result.translatedContent}
            summaryTerms={result.summaryTerms}
            documentImages={result.documentImages}
            documentCodeBlocks={result.documentCodeBlocks}
          />
        </section>
      </div>
    </article>
  );
};
