"use client";

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { BouncingText } from "@/components/atoms/text/bouncing-text";
import { pickRandomLoadingMessage } from "@/constants/translation-loading-messages";

const DEFAULT_ROTATE_INTERVAL_MS = 3500;

interface LoadingBarProps {
  message?: string;
  messages?: readonly string[];
  rotateIntervalMs?: number;
}

export const LoadingBar = ({
  message,
  messages,
  rotateIntervalMs = DEFAULT_ROTATE_INTERVAL_MS,
}: LoadingBarProps): ReactElement => {
  const [activeMessage, setActiveMessage] = useState<string>(() => {
    if (message) return message;
    if (messages?.length) return pickRandomLoadingMessage(messages);
    return "불러오는 중입니다...";
  });

  useEffect(() => {
    if (message) {
      setActiveMessage(message);
      return;
    }

    if (!messages?.length) return;

    setActiveMessage(pickRandomLoadingMessage(messages));

    const intervalId = window.setInterval(() => {
      setActiveMessage((current) => {
        if (messages.length === 1) return current;

        let next = pickRandomLoadingMessage(messages);
        let attempts = 0;

        while (next === current && attempts < 8) {
          next = pickRandomLoadingMessage(messages);
          attempts += 1;
        }

        return next;
      });
    }, rotateIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [message, messages, rotateIntervalMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={activeMessage}
      className="flex w-full flex-col gap-3"
    >
      <p className="font-doc-aux min-h-[1.25rem] text-sm font-medium text-indigo-600">
        <BouncingText text={activeMessage} />
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
        <div className="loading-bar-indicator h-full w-1/3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
      </div>
    </div>
  );
};
