import type { ReactElement } from "react";
import {
  applyInlineMarkupToSegments,
  expandSegmentsWithSectionLabels,
  splitTextByHighlights,
  type TextSegment,
} from "@/lib/translation/markup/highlight-keywords";
import {
  normalizeInlineMarkupSource,
  stripSectionHeadingMarkup,
  resolveSectionHeadingText,
} from "@/lib/translation/markup/inline-markup-utils";
import { normalizeTranslatedLayout } from "@/lib/translation/markup/normalize-translated-layout";
import { normalizeTerminologyMarkup } from "@/lib/translation/markup/normalize-terminology-markup";
import { normalizeSummaryTerms } from "@/lib/translation/markup/summary-terms-normalizer";
import {
  stripParagraphMarker,
  stripParagraphMarkersFromContent,
} from "@/lib/translation/markup/strip-paragraph-markers";
import { KeywordSummary } from "@/components/molecules/document/keyword-summary";
import { TranslationSectionHeading } from "@/components/atoms/text/translation-section-heading";
import {
  normalizeSummaryOutputSections,
  normalizeTranslationSections,
} from "@/lib/translation/markup/translation-section-utils";
import { groupDocumentImagesBySectionIndex } from "@/lib/translation/merge-document-images";
import { parseTranslationListItemLine } from "@/lib/translation/markup/translation-list-line-utils";
import { parseDashSectionLabelLine } from "@/lib/translation/markup/translation-section-label-utils";
import { splitTextByImportancePhrases } from "@/lib/translation/markup/translation-importance-phrases";
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
  /** 전체 직역(번역결과)일 때 중요 구절 자동 굵게 보강 */
  emphasizeImportancePhrases?: boolean;
  /**
   * "summary"(기본값): 핵심요약 9개 고정 섹션 구조로 강제 매핑.
   * "full": 원문 제목·소제목을 그대로 살리는 일반 섹션 분리 — 완전 번역용.
   */
  sectionMode?: "summary" | "full";
  /** 마크다운 링크가 상대 경로일 때 절대 경로로 풀어주는 기준 URL */
  baseUrl?: string;
}

const resolveLinkHref = (href: string, baseUrl?: string): string => {
  if (!baseUrl || /^[a-z][a-z0-9+.-]*:/i.test(href)) {
    return href;
  }

  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
};

type TranslationBodyBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "dashSectionLabel"; label: string; body: string };

const parseTranslationBodyBlocks = (body: string): TranslationBodyBlock[] => {
  const blocks: TranslationBodyBlock[] = [];
  const paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = (): void => {
    const text = paragraphLines.join("\n").trim();

    if (!text) {
      paragraphLines.length = 0;
      return;
    }

    blocks.push({ type: "paragraph", text });
    paragraphLines.length = 0;
  };

  const flushList = (): void => {
    if (listItems.length > 0) {
      blocks.push({ type: "list", items: listItems });
    }

    listItems = [];
  };

  body.split("\n").forEach((line) => {
    const trimmedLine = line.trim();
    const dashSectionLabel = parseDashSectionLabelLine(line);

    if (dashSectionLabel) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "dashSectionLabel",
        label: dashSectionLabel.label,
        body: dashSectionLabel.body,
      });
      return;
    }

    const listItem = parseTranslationListItemLine(line);

    if (listItem) {
      flushParagraph();
      listItems.push(listItem);
      return;
    }

    if (!trimmedLine) {
      flushParagraph();
      flushList();
      return;
    }

    flushList();
    paragraphLines.push(line);
  });

  flushParagraph();
  flushList();

  return blocks;
};

const renderInlineSegments = (
  segments: TextSegment[],
  keyPrefix: string,
  baseUrl?: string,
): ReactElement[] => {
  return segments.map((segment, segmentIndex) => {
    const segmentKey = `${keyPrefix}-${segmentIndex}`;

    if (segment.type === "keyword") {
      const innerSegments = applyInlineMarkupToSegments([
        { type: "text", value: segment.value },
      ]);

      return (
        <span key={`keyword-${segmentKey}`} className="emphasis-underline">
          {renderInlineSegments(innerSegments, `${segmentKey}-keyword`, baseUrl)}
        </span>
      );
    }

    if (segment.type === "emphasis") {
      const innerSegments = applyInlineMarkupToSegments([
        { type: "text", value: segment.value },
      ]);

      return (
        <span key={`emphasis-${segmentKey}`} className="emphasis-underline">
          {renderInlineSegments(innerSegments, `${segmentKey}-inner`, baseUrl)}
        </span>
      );
    }

    if (segment.type === "bold") {
      const innerSegments = applyInlineMarkupToSegments([
        { type: "text", value: segment.value },
      ]);

      return (
        <strong key={`bold-${segmentKey}`} className="note-highlight">
          {renderInlineSegments(innerSegments, `${segmentKey}-inner`, baseUrl)}
        </strong>
      );
    }

    if (segment.type === "section-label") {
      return (
        <strong
          key={`section-label-${segmentKey}`}
          className="section-label font-doc-translation-bold"
        >
          {segment.value}
        </strong>
      );
    }

    if (segment.type === "link" && segment.href) {
      const innerSegments = applyInlineMarkupToSegments([
        { type: "text", value: segment.value },
      ]);

      return (
        <a
          key={`link-${segmentKey}`}
          href={resolveLinkHref(segment.href, baseUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="emphasis-underline text-blue-700 hover:text-blue-900"
        >
          {renderInlineSegments(innerSegments, `${segmentKey}-link`, baseUrl)}
        </a>
      );
    }

    return <span key={`text-${segmentKey}`}>{segment.value}</span>;
  });
};

const renderHighlightedSegments = (
  paragraph: string,
  summaryTerms: KeywordTerm[],
  sectionIndex: number,
  emphasizeImportancePhrases: boolean,
  baseUrl?: string,
): ReactElement[] => {
  const segmentsWithMarkup = expandSegmentsWithSectionLabels([
    { type: "text", value: paragraph },
  ]).flatMap((segment) => {
    if (segment.type !== "text") {
      return [segment];
    }

    return applyInlineMarkupToSegments([segment]);
  });
  const segmentsWithImportance = segmentsWithMarkup.flatMap((segment) => {
    if (!emphasizeImportancePhrases || segment.type !== "text") {
      return [segment];
    }

    return splitTextByImportancePhrases(segment.value);
  });
  const segmentsWithKeywords = segmentsWithImportance.flatMap((segment) => {
    if (segment.type !== "text") {
      return [segment];
    }

    return splitTextByHighlights(segment.value, summaryTerms);
  });

  return renderInlineSegments(segmentsWithKeywords, String(sectionIndex), baseUrl);
};

const renderBodyBlock = (
  block: TranslationBodyBlock,
  summaryTerms: KeywordTerm[],
  sectionIndex: number,
  blockIndex: number,
  emphasizeImportancePhrases: boolean,
  baseUrl?: string,
): ReactElement => {
  if (block.type === "dashSectionLabel") {
    return (
      <p
        key={`section-${sectionIndex}-dash-label-${blockIndex}`}
        className="translation-paragraph whitespace-pre-wrap"
      >
        <strong className="section-label font-doc-translation-bold">
          -{block.label}:
        </strong>
        {block.body ? (
          <>
            {" "}
            {renderHighlightedSegments(
              block.body,
              summaryTerms,
              sectionIndex + blockIndex,
              emphasizeImportancePhrases,
              baseUrl,
            )}
          </>
        ) : null}
      </p>
    );
  }

  if (block.type === "list") {
    return (
      <ul
        key={`section-${sectionIndex}-list-${blockIndex}`}
        className="translation-list"
      >
        {block.items.map((item, itemIndex) => (
          <li key={`section-${sectionIndex}-list-${blockIndex}-${itemIndex}`}>
            {renderHighlightedSegments(
              item,
              summaryTerms,
              sectionIndex + blockIndex + itemIndex,
              emphasizeImportancePhrases,
              baseUrl,
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p
      key={`section-${sectionIndex}-paragraph-${blockIndex}`}
      className="translation-paragraph whitespace-pre-wrap"
    >
      {renderHighlightedSegments(
        block.text,
        summaryTerms,
        sectionIndex,
        emphasizeImportancePhrases,
        baseUrl,
      )}
    </p>
  );
};

export const HighlightedTranslationContent = ({
  content,
  summaryTerms,
  documentImages = [],
  documentCodeBlocks = [],
  emphasizeImportancePhrases = true,
  sectionMode = "summary",
  baseUrl,
}: HighlightedTranslationContentProps): ReactElement => {
  const normalizedTerms = normalizeSummaryTerms(summaryTerms);
  const imagesBySection = groupDocumentImagesBySectionIndex(documentImages);
  const normalizedContent = normalizeTerminologyMarkup(
    stripParagraphMarkersFromContent(
      normalizeTranslatedLayout(normalizeInlineMarkupSource(content)),
    ),
  );
  const sections = (
    sectionMode === "full"
      ? normalizeTranslationSections(normalizedContent)
      : normalizeSummaryOutputSections(normalizedContent)
  ).map((section) => ({
    heading: section.heading
      ? resolveSectionHeadingText(stripSectionHeadingMarkup(stripParagraphMarker(section.heading)))
      : null,
    body: stripParagraphMarker(section.body),
  }));

  return (
    <div className="translation-content pt-1 text-zinc-800">
      {sections.map((section, sectionIndex) => {
        if (!section.heading && !section.body) {
          return null;
        }

        const sectionImages =
          imagesBySection.get(sectionIndex) ??
          imagesBySection.get(sectionIndex + 1) ??
          [];
        const isCodeExampleSection = section.heading === "코드 예제 설명";

        return (
          <section
            key={`section-${sectionIndex}`}
            className="translation-section mb-6 last:mb-0"
          >
            {section.heading && (
              <TranslationSectionHeading className="mb-2">
                {section.heading}
              </TranslationSectionHeading>
            )}
            {sectionImages.map((image) => (
              <DocumentImageFigure key={image.id} image={image} />
            ))}
            {section.heading === "핵심 용어" && normalizedTerms.length > 0 ? (
              <KeywordSummary summaryTerms={normalizedTerms} />
            ) : (
              section.body &&
              parseTranslationBodyBlocks(section.body).map((block, blockIndex) =>
                renderBodyBlock(
                  block,
                  normalizedTerms,
                  sectionIndex,
                  blockIndex,
                  emphasizeImportancePhrases,
                  baseUrl,
                ),
              )
            )}
            {isCodeExampleSection &&
              documentCodeBlocks.map((block) => (
                <PackageManagerCodeTabs key={block.id} block={block} />
              ))}
          </section>
        );
      })}
    </div>
  );
};
