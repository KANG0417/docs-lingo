export interface ResolvedTranslationContents {
  translatedSummaryContent: string;
  translatedFullContent: string;
}

export const resolveTranslationContents = (
  content: string,
  summaryContent: string | null | undefined,
  fullContent?: string | null,
): ResolvedTranslationContents => {
  const storedContent = content.trim();
  const summary = summaryContent?.trim() ?? "";
  const full = fullContent?.trim() ?? "";
  const resolvedSummary = summary || storedContent;

  return {
    translatedSummaryContent: resolvedSummary,
    // 전체 번역은 처음 탭을 누를 때 생성되어 캐시되므로, 아직 없으면 핵심요약을 임시로 보여준다.
    translatedFullContent: full || resolvedSummary,
  };
};
