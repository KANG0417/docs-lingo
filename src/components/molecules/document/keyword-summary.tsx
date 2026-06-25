import type { ReactElement } from "react";
import { splitTextByInlineMarkup } from "@/lib/translation/markup/highlight-keywords";
import { normalizeSummaryTerms } from "@/lib/translation/markup/summary-terms-normalizer";
import type { KeywordTerm } from "@/types/translation";

interface KeywordSummaryProps {
  summaryTerms: KeywordTerm[];
}

const renderDescriptionSegments = (description: string): ReactElement[] => {
  return splitTextByInlineMarkup(description).map((segment, index) => {
    if (segment.type === "bold") {
      return (
        <strong key={`desc-bold-${index}`} className="note-highlight">
          {segment.value}
        </strong>
      );
    }

    return <span key={`desc-text-${index}`}>{segment.value}</span>;
  });
};

export const KeywordSummary = ({
  summaryTerms,
}: KeywordSummaryProps): ReactElement => {
  const normalizedTerms = normalizeSummaryTerms(summaryTerms);

  if (normalizedTerms.length === 0) {
    return (
      <p className="font-doc-aux text-sm text-amber-700/70">
        추출된 핵심 키워드가 없습니다.
      </p>
    );
  }

  return (
    <ul className="keyword-summary flex flex-col gap-3">
      {normalizedTerms.map((item) => (
        <li
          key={item.term}
          className="font-doc-translation rounded-md border border-dashed border-amber-300 bg-white/70 px-4 py-3 text-sm leading-relaxed text-zinc-800"
        >
          <code className="keyword-chip">{item.term}</code>
          <span className="mx-2 font-bold text-amber-700">:</span>
          <span>{renderDescriptionSegments(item.description)}</span>
        </li>
      ))}
    </ul>
  );
};
