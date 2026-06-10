import type { ReactElement } from "react";
import {
  splitContentByParagraphs,
  splitTextByHighlights,
} from "@/lib/highlight-keywords";
import { normalizeSummaryTerms } from "@/lib/summary-terms-normalizer";
import type { KeywordTerm } from "@/types/translation";

interface HighlightedTranslationContentProps {
  content: string;
  summaryTerms: KeywordTerm[];
}

const renderHighlightedSegments = (
  paragraph: string,
  summaryTerms: KeywordTerm[],
  paragraphIndex: number,
): ReactElement[] => {
  return splitTextByHighlights(paragraph, summaryTerms).map(
    (segment, segmentIndex) => {
      const segmentKey = `${paragraphIndex}-${segmentIndex}`;

      if (segment.type === "keyword") {
        return (
          <code key={`keyword-${segmentKey}`} className="keyword-chip">
            {segment.value}
          </code>
        );
      }

      if (segment.type === "emphasis") {
        return (
          <span key={`emphasis-${segmentKey}`} className="emphasis-underline">
            {segment.value}
          </span>
        );
      }

      return <span key={`text-${segmentKey}`}>{segment.value}</span>;
    },
  );
};

export const HighlightedTranslationContent = ({
  content,
  summaryTerms,
}: HighlightedTranslationContentProps): ReactElement => {
  const normalizedTerms = normalizeSummaryTerms(summaryTerms);
  const paragraphs = splitContentByParagraphs(content);

  return (
    <div className="memo-lines max-h-[28rem] overflow-y-auto pt-1 text-sm text-zinc-800">
      {paragraphs.map((paragraph, paragraphIndex) => (
        <p
          key={`paragraph-${paragraphIndex}`}
          className="mb-4 whitespace-pre-wrap leading-[28px] last:mb-0"
        >
          {renderHighlightedSegments(
            paragraph,
            normalizedTerms,
            paragraphIndex,
          )}
        </p>
      ))}
    </div>
  );
};
