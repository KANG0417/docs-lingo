import type { ReactElement } from "react";
import { splitTextByCoreKeywords } from "@/lib/highlight-keywords";
import type { KeywordTerm } from "@/types/translation";

interface HighlightedTranslationContentProps {
  content: string;
  summaryTerms: KeywordTerm[];
}

export const HighlightedTranslationContent = ({
  content,
  summaryTerms,
}: HighlightedTranslationContentProps): ReactElement => {
  const segments = splitTextByCoreKeywords(content, summaryTerms);

  return (
    <div className="memo-lines max-h-[28rem] overflow-y-auto whitespace-pre-wrap pt-1 text-sm leading-[28px] text-zinc-800">
      {segments.map((segment, index) => {
        if (segment.type === "keyword") {
          return (
            <code key={`keyword-${index}`} className="keyword-chip">
              {segment.value}
            </code>
          );
        }

        return <span key={`text-${index}`}>{segment.value}</span>;
      })}
    </div>
  );
};
