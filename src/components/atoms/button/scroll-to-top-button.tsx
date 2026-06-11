"use client";

import clsx from "clsx";
import type { ReactElement } from "react";
import { SCROLL_TO_TOP_VISIBLE_THRESHOLD } from "@/constants/scroll";
import { useWindowScroll } from "@/hooks/use-window-scroll";

export const ScrollToTopButton = (): ReactElement => {
  const { isPastThreshold } = useWindowScroll({
    threshold: SCROLL_TO_TOP_VISIBLE_THRESHOLD,
  });

  const handleScrollToTop = (): void => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      aria-label="맨 위로 이동"
      onClick={handleScrollToTop}
      className={clsx(
        "fixed bottom-6 right-6 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#0a1030] text-indigo-100 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#141c4a] active:translate-y-0",
        isPastThreshold
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 19V5M5 12l7-7 7 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
};
