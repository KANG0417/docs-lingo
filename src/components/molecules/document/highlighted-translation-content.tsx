import type { ReactElement } from "react";
import {
  applyInlineMarkupToSegments,
  expandSegmentsWithSectionLabels,
  splitContentByParagraphs,
  splitTextByHighlights,
} from "@/lib/highlight-keywords";
import { normalizeTranslatedLayout } from "@/lib/normalize-translated-layout";
import { normalizeSummaryTerms } from "@/lib/summary-terms-normalizer";
import {
  stripParagraphMarker,
  stripParagraphMarkersFromContent,
} from "@/lib/strip-paragraph-markers";
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
  const segmentsWithMarkup = applyInlineMarkupToSegments([
    { type: "text", value: paragraph },
  ]);
  const segmentsWithKeywords = segmentsWithMarkup.flatMap((segment) => {
    if (segment.type !== "text") {
      return [segment];
    }

    return splitTextByHighlights(segment.value, summaryTerms);
  });

  return expandSegmentsWithSectionLabels(segmentsWithKeywords).map(
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

    if (segment.type === "section-label") {
      return (
        <strong key={`section-label-${segmentKey}`} className="section-label">
          {segment.value}
        </strong>
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
  const paragraphs = splitContentByParagraphs(
    stripParagraphMarkersFromContent(normalizeTranslatedLayout(content)),
  )
    .map(stripParagraphMarker)
    .filter((paragraph) => paragraph.length > 0);

  return (
    <div className="translation-content memo-lines max-h-[28rem] overflow-y-auto pt-1 text-zinc-800">
      {paragraphs.map((paragraphText, paragraphIndex) => {
        return (
          <p
            key={`paragraph-${paragraphIndex}`}
            className="translation-paragraph mb-4 whitespace-pre-wrap last:mb-0"
          >
            <span className="paragraph-highlighter">
              문단{paragraphIndex + 1}
            </span>
            <span aria-hidden="true" className="paragraph-highlighter-break">
              {"\n"}
            </span>
            {renderHighlightedSegments(paragraphText, normalizedTerms, paragraphIndex)}
          </p>
        );
      })}
    </div>
  );
};
