"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

interface TypingTextProps {
  text: string;
  className?: string;
  cursorClassName?: string;
  typingSpeedMs?: number;
  deletingSpeedMs?: number;
  pauseAfterTypedMs?: number;
  pauseAfterDeletedMs?: number;
}

export const TypingText = ({
  text,
  className,
  cursorClassName = "bg-zinc-800",
  typingSpeedMs = 90,
  deletingSpeedMs = 45,
  pauseAfterTypedMs = 1600,
  pauseAfterDeletedMs = 500,
}: TypingTextProps): ReactElement => {
  const [charCount, setCharCount] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // 모두 입력된 후 마지막 글자 위에서 커서가 깜빡인다.
  const isFullyTyped = !isDeleting && charCount === text.length;
  // 모두 지워진 후에도 잠시 깜빡인다.
  const isEmptyPaused = isDeleting && charCount === 0;

  useEffect(() => {
    let delay: number;

    if (!isDeleting) {
      delay = charCount === text.length ? pauseAfterTypedMs : typingSpeedMs;
    } else {
      delay = charCount === 0 ? pauseAfterDeletedMs : deletingSpeedMs;
    }

    const timeoutId = window.setTimeout(() => {
      if (!isDeleting) {
        if (charCount < text.length) {
          setCharCount((prev) => prev + 1);
        } else {
          setIsDeleting(true);
        }
      } else {
        if (charCount > 0) {
          setCharCount((prev) => prev - 1);
        } else {
          setIsDeleting(false);
        }
      }
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [
    charCount,
    isDeleting,
    text,
    typingSpeedMs,
    deletingSpeedMs,
    pauseAfterTypedMs,
    pauseAfterDeletedMs,
  ]);

  return (
    <span className="relative inline-block" aria-label={text}>
      {/* 레이아웃 흔들림 방지를 위한 자리 차지용 텍스트 */}
      <span aria-hidden="true" className={clsx("invisible", className)}>
        {text}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center whitespace-nowrap"
      >
        <span className={className}>{text.slice(0, charCount)}</span>
        {/* 글자 끝을 따라다니는 블록 커서. 입력이 멈춘 동안에만 깜빡인다. */}
        <span
          className={clsx(
            "ml-1 inline-block h-[1em] w-[0.55em]",
            (isFullyTyped || isEmptyPaused) && "typing-cursor",
            cursorClassName,
          )}
        />
      </span>
    </span>
  );
};
