import { isTextDocumentUrl } from "@/lib/document/text-document-url";
import {
  buildDocumentDisplayTitle,
  translateDocumentSlugFromUrl,
} from "@/lib/translation/engine/translate-document-slug";
import { translateDocumentTitle } from "@/lib/translation/engine/translate-document-title";
import type { KeywordTerm } from "@/types/translation";

interface BuildHistorySummaryParams {
  title: string;
  url: string | null;
  summaryTerms: KeywordTerm[];
}

const MAX_SUMMARY_LENGTH = 48;

export const truncateHistoryTitle = (title: string): string => {
  const trimmedTitle = title.trim();

  if (trimmedTitle.length <= MAX_SUMMARY_LENGTH) {
    return trimmedTitle;
  }

  return `${trimmedTitle.slice(0, MAX_SUMMARY_LENGTH - 1)}…`;
};

export const buildTranslationHistorySummary = ({
  title,
  url,
}: BuildHistorySummaryParams): string => {
  const slugSummary = translateDocumentSlugFromUrl(url);

  if (slugSummary) {
    return truncateHistoryTitle(slugSummary);
  }

  if (!url || isTextDocumentUrl(url)) {
    return truncateHistoryTitle(translateDocumentTitle(title));
  }

  return truncateHistoryTitle(translateDocumentTitle(title));
};
