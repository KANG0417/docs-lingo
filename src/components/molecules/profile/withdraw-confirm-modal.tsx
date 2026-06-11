"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactElement } from "react";
import { WITHDRAWAL_CONFIRMATION_PHRASE } from "@/constants/withdrawal";
import { formatWithdrawalScheduledAt } from "@/lib/format-withdrawal-scheduled-at";

interface WithdrawConfirmModalProps {
  isOpen: boolean;
  scheduledAtPreview: string;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const WithdrawConfirmModal = ({
  isOpen,
  scheduledAtPreview,
  isSubmitting,
  onClose,
  onConfirm,
}: WithdrawConfirmModalProps): ReactElement | null => {
  const [confirmationText, setConfirmationText] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isPhraseMatched = confirmationText === WITHDRAWAL_CONFIRMATION_PHRASE;
  const formattedScheduledAt = formatWithdrawalScheduledAt(scheduledAtPreview);

  useEffect(() => {
    if (!isOpen) {
      setConfirmationText("");
      return;
    }

    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (): void => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleDialogClick = (event: MouseEvent<HTMLDivElement>): void => {
    event.stopPropagation();
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl -rotate-[0.5deg]">
        <span
          aria-hidden="true"
          className="absolute -top-3 left-1/2 z-10 h-6 w-28 -translate-x-1/2 rotate-1 rounded-[2px] bg-red-200/50 shadow-sm backdrop-blur-sm"
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdraw-modal-title"
          aria-describedby="withdraw-modal-description"
          className="memo-lines rounded-sm bg-amber-50 p-8 shadow-[4px_8px_24px_rgba(0,0,0,0.4)]"
          onClick={handleDialogClick}
        >
          <h2
            id="withdraw-modal-title"
            className="whitespace-nowrap text-center text-xl font-extrabold text-red-700"
          >
            회원 탈퇴 확인
          </h2>

          <p
            id="withdraw-modal-description"
            className="mt-4 whitespace-nowrap text-center text-sm font-bold text-red-700"
          >
            탈퇴 시 프로필, 북마크, 번역 히스토리가 모두 삭제되며 복구할 수 없습니다.
          </p>

          <p className="mt-3 whitespace-nowrap text-center text-sm font-semibold text-amber-900">
            24시간 이내 탈퇴 취소를 하지 않으면 아래 시각에 탈퇴가 완료됩니다.
          </p>

          <p className="mt-5 whitespace-nowrap text-center text-sm font-semibold text-amber-900">
            탈퇴 예정 시각
          </p>
          <time
            dateTime={scheduledAtPreview}
            className="mt-1 block whitespace-nowrap text-center text-base font-extrabold text-[#0a1030]"
          >
            {formattedScheduledAt}
          </time>

          <label className="mt-6 flex flex-col gap-3">
            <span className="whitespace-nowrap text-center text-sm font-semibold text-amber-900">
              확인을 위해{" "}
              <span className="font-extrabold text-red-700">
                &quot;{WITHDRAWAL_CONFIRMATION_PHRASE}&quot;
              </span>
              를 입력해주세요. (따옴표는 입력하지 않습니다)
            </span>
            <input
              ref={inputRef}
              type="text"
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              placeholder={WITHDRAWAL_CONFIRMATION_PHRASE}
              disabled={isSubmitting}
              autoComplete="off"
              aria-label={`${WITHDRAWAL_CONFIRMATION_PHRASE} 입력`}
              className="h-12 w-full rounded-md bg-white/90 px-4 text-center text-sm font-semibold text-zinc-900 placeholder:font-normal placeholder:text-amber-700/40 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-amber-100/50"
            />
          </label>

          <div className="mt-6 flex justify-center gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex h-11 w-32 items-center justify-center rounded-md bg-white text-sm font-semibold text-zinc-600 shadow-sm transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!isPhraseMatched || isSubmitting}
              className="inline-flex h-11 w-32 items-center justify-center rounded-md bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
            >
              {isSubmitting ? "예약 중..." : "탈퇴 예약"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
