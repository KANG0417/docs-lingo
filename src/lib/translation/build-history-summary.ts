import { getSiteLabelFromUrl } from "@/lib/document/normalize-document-url";
import { isTextDocumentUrl } from "@/lib/document/text-document-url";
import { translateDocumentTitle } from "@/lib/translation/translate-document-title";
import type { KeywordTerm } from "@/types/translation";

interface BuildHistorySummaryParams {
  title: string;
  url: string | null;
  summaryTerms: KeywordTerm[];
}

const MAX_TITLE_LENGTH = 36;

export const truncateHistoryTitle = (title: string): string => {
  const trimmedTitle = title.trim();

  if (trimmedTitle.length <= MAX_TITLE_LENGTH) {
    return trimmedTitle;
  }

  return `${trimmedTitle.slice(0, MAX_TITLE_LENGTH - 1)}…`;
};

const truncateTitle = truncateHistoryTitle;

const formatOfficialSiteName = (hostname: string): string => {
  const normalizedHost = hostname.replace(/^www\./, "");

  const knownHostnames: Record<string, string> = {
    "nextjs.org": "Next.js",
    "react.dev": "React",
    "vuejs.org": "Vue.js",
    "nodejs.org": "Node.js",
    "docs.python.org": "Python",
    "developer.mozilla.org": "MDN",
  };

  if (knownHostnames[normalizedHost]) {
    return knownHostnames[normalizedHost];
  }

  const siteKey = normalizedHost.split(".")[0]?.toLowerCase() ?? normalizedHost;

  const knownSiteNames: Record<string, string> = {
    nextjs: "Next.js",
    react: "React",
    vuejs: "Vue.js",
    nodejs: "Node.js",
    python: "Python",
  };

  return knownSiteNames[siteKey] ?? siteKey.charAt(0).toUpperCase() + siteKey.slice(1);
};

const getCoreTermLabels = (summaryTerms: KeywordTerm[]): string[] => {
  return summaryTerms
    .filter((term) => term.isCoreKeyword && term.term.trim())
    .slice(0, 3)
    .map((term) => term.term.trim());
};

export const buildTranslationHistorySummary = ({
  title,
  url,
  summaryTerms,
}: BuildHistorySummaryParams): string => {
  const shortTitle = truncateTitle(translateDocumentTitle(title));
  const coreTerms = getCoreTermLabels(summaryTerms);

  if (!url || isTextDocumentUrl(url)) {
    if (coreTerms.length > 0) {
      return `직접 입력 텍스트에서 ${coreTerms.join("·")} 관련 내용을 요약했습니다.`;
    }

    return `직접 입력 텍스트 「${shortTitle}」 내용을 요약했습니다.`;
  }

  const siteLabel = getSiteLabelFromUrl(url);
  const siteName = formatOfficialSiteName(siteLabel);

  if (coreTerms.length > 0) {
    return `${siteName} 공식 문서의 ${coreTerms.join("·")} 관련 내용을 요약했습니다.`;
  }

  return `${siteName} 공식 문서 「${shortTitle}」 페이지 내용을 요약했습니다.`;
};
