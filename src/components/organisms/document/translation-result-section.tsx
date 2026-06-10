import type { ReactElement } from "react";
import { HighlightedTranslationContent } from "@/components/molecules/document/highlighted-translation-content";
import { KeywordSummary } from "@/components/molecules/document/keyword-summary";
import type { DocumentTranslationResult } from "@/types/translation";

interface TranslationResultSectionProps {
  result: DocumentTranslationResult;
}

export const TranslationResultSection = ({
  result,
}: TranslationResultSectionProps): ReactElement => {
  return (
    <article className="relative w-full rotate-[0.6deg]">
      <span
        aria-hidden="true"
        className="absolute -top-2.5 left-6 z-10 h-5 w-16 -rotate-6 rounded-[2px] bg-violet-200/40 shadow-sm backdrop-blur-sm"
      />
      <span
        aria-hidden="true"
        className="absolute -top-2.5 right-6 z-10 h-5 w-16 rotate-6 rounded-[2px] bg-indigo-200/40 shadow-sm backdrop-blur-sm"
      />

      <div className="rounded-sm border border-amber-200 bg-amber-50 p-6 shadow-[4px_8px_24px_rgba(0,0,0,0.45)]">
        <header className="flex flex-col gap-1 border-b border-dashed border-amber-300 pb-4">
          <h2 className="text-lg font-bold text-zinc-900">{result.title}</h2>
          {result.url && (
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-xs text-indigo-600 underline underline-offset-2"
            >
              {result.url}
            </a>
          )}
        </header>

        {result.summaryTerms.length > 0 && (
          <section className="mt-5 border-b border-dashed border-amber-300 pb-5">
            <h3 className="mb-3 text-sm font-bold text-amber-900">
              핵심 키워드 요약
            </h3>
            <KeywordSummary summaryTerms={result.summaryTerms} />
          </section>
        )}

        <section className="mt-5">
          <h3 className="mb-3 text-sm font-bold text-amber-900">
            번역 결과
          </h3>
          <HighlightedTranslationContent
            content={result.translatedContent}
            summaryTerms={result.summaryTerms}
          />
        </section>
      </div>
    </article>
  );
};
