import type { ReactElement } from "react";
import {
  applyInlineMarkupToSegments,
  expandSegmentsWithSectionLabels,
  splitTextByHighlights,
} from "@/lib/translation/highlight-keywords";
import { normalizeTranslatedLayout } from "@/lib/translation/normalize-translated-layout";
import { normalizeSummaryTerms } from "@/lib/translation/summary-terms-normalizer";
import {
  stripParagraphMarker,
  stripParagraphMarkersFromContent,
} from "@/lib/translation/strip-paragraph-markers";
import { splitContentBySections } from "@/lib/translation/translation-section-utils";
import { groupDocumentImagesBySectionIndex } from "@/lib/translation/merge-document-images";
import { groupDocumentCodeBlocksBySectionIndex } from "@/lib/translation/merge-document-code-blocks";
import { DocumentImageFigure } from "@/components/molecules/document/document-image-figure";
import { PackageManagerCodeTabs } from "@/components/molecules/document/package-manager-code-tabs";
import type { DocumentCodeBlock } from "@/types/document-code-block";
import type { DocumentImage } from "@/types/document-image";
import type { KeywordTerm } from "@/types/translation";

interface HighlightedTranslationContentProps {
  content: string;
  summaryTerms: KeywordTerm[];
  documentImages?: DocumentImage[];
  documentCodeBlocks?: DocumentCodeBlock[];
}

const renderHighlightedSegments = (
  paragraph: string,
  summaryTerms: KeywordTerm[],
  sectionIndex: number,
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
      const segmentKey = `${sectionIndex}-${segmentIndex}`;

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
  documentImages = [],
  documentCodeBlocks = [],
}: HighlightedTranslationContentProps): ReactElement => {
  const normalizedTerms = normalizeSummaryTerms(summaryTerms);
  const imagesBySection = groupDocumentImagesBySectionIndex(documentImages);
  const codeBlocksBySection =
    groupDocumentCodeBlocksBySectionIndex(documentCodeBlocks);
  const sections = splitContentBySections(
    stripParagraphMarkersFromContent(normalizeTranslatedLayout(content)),
  ).map((section) => ({
    heading: section.heading ? stripParagraphMarker(section.heading) : null,
    body: stripParagraphMarker(section.body),
  }));

  return (
    <div className="translation-content memo-lines max-h-[28rem] overflow-y-auto pt-1 text-zinc-800">
      {sections.map((section, sectionIndex) => {
        if (!section.heading && !section.body) {
          return null;
        }

        const sectionImages =
          imagesBySection.get(sectionIndex) ??
          imagesBySection.get(sectionIndex + 1) ??
          [];
        const sectionCodeBlocks =
          codeBlocksBySection.get(sectionIndex) ??
          codeBlocksBySection.get(sectionIndex + 1) ??
          [];

        return (
          <section
            key={`section-${sectionIndex}`}
            className="translation-section mb-6 last:mb-0"
          >
            {section.heading && (
              <h4 className="translation-section-heading font-doc-translation-bold mb-2 text-base font-bold text-zinc-900">
                {section.heading}
              </h4>
            )}
            {sectionImages.map((image) => (
              <DocumentImageFigure key={image.id} image={image} />
            ))}
            {sectionCodeBlocks.map((block) => (
              <PackageManagerCodeTabs key={block.id} block={block} />
            ))}
            {section.body && (
              <p className="translation-paragraph whitespace-pre-wrap">
                {renderHighlightedSegments(
                  section.body,
                  normalizedTerms,
                  sectionIndex,
                )}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
};
