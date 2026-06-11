import type { ReactElement } from "react";
import { normalizeSummaryTerms } from "@/lib/summary-terms-normalizer";
import type { KeywordTerm } from "@/types/translation";

interface KeywordSummaryProps {
  summaryTerms: KeywordTerm[];
}

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
    <ul className="flex flex-col gap-3">
      {normalizedTerms.map((item) => (
        <li
          key={item.term}
          className="font-doc-translation rounded-md border border-dashed border-amber-300 bg-white/70 px-4 py-3 text-sm leading-relaxed text-zinc-800"
        >
          {item.isCoreKeyword ? (
            <code className="keyword-chip">{item.term}</code>
          ) : (
            <span className="emphasis-underline">{item.term}</span>
          )}
          <span className="mx-2 font-bold text-amber-700">:</span>
          <span>{item.description}</span>
        </li>
      ))}
    </ul>
  );
};
