import type { ReactElement } from "react";
import type { TranslationHistoryItem } from "@/types/translation";

interface HistoryAlbumCardProps {
  item: TranslationHistoryItem;
  isSelected: boolean;
  onSelect: (item: TranslationHistoryItem) => void;
}

const formatHistoryDate = (createdAt: string): string => {
  const date = new Date(createdAt);
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
};

export const HistoryAlbumCard = ({
  item,
  isSelected,
  onSelect,
}: HistoryAlbumCardProps): ReactElement => {
  const coreKeywords = item.summaryTerms
    .filter((term) => term.isCoreKeyword)
    .slice(0, 2);

  const handleClick = (): void => {
    onSelect(item);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group flex w-full flex-col overflow-hidden rounded-md border text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        isSelected
          ? "border-indigo-400 bg-indigo-50/80 ring-2 ring-indigo-200"
          : "border-amber-200 bg-white/90"
      }`}
    >
      <div className="flex aspect-[4/3] flex-col justify-between bg-gradient-to-br from-[#0a1030] via-[#141c4a] to-[#312e81] p-4">
        <span className="line-clamp-3 text-sm font-bold leading-snug text-indigo-50">
          {item.title}
        </span>
        <span className="text-xs font-medium text-indigo-200/80">
          {formatHistoryDate(item.createdAt)}
        </span>
      </div>

      <div className="flex flex-col gap-2 px-3 py-3">
        {coreKeywords.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {coreKeywords.map((keyword) => (
              <code key={keyword.term} className="keyword-chip text-[0.65rem]">
                {keyword.term}
              </code>
            ))}
          </div>
        ) : (
          <span className="text-xs text-amber-700/70">키워드 없음</span>
        )}
      </div>
    </button>
  );
};
