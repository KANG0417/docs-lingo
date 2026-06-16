"use client";

import clsx from "clsx";
import Link from "next/link";
import { UserAvatar } from "@/components/atoms/avatar/user-avatar";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { signOutFromSns } from "@/services/auth-service";

interface UserMenuProps {
  nickname: string;
  image: string | null;
  onOpenChange?: (isOpen: boolean) => void;
}

export const UserMenu = ({
  nickname,
  image,
  onOpenChange,
}: UserMenuProps): ReactElement => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const setMenuOpen = useCallback(
    (nextOpen: boolean): void => {
      setIsOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent): void => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (rootRef.current?.contains(target)) {
        return;
      }

      setMenuOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen, setMenuOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, setMenuOpen]);

  const handleToggle = (): void => {
    setMenuOpen(!isOpen);
  };

  const handleClose = (): void => {
    setMenuOpen(false);
  };

  const handleSignOut = (): void => {
    void signOutFromSns();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-3.5 rounded-full py-2 pl-2 pr-5 transition-colors hover:bg-white/10"
      >
        <UserAvatar nickname={nickname} image={image} size="sm" />
        <span className="font-doc-nickname text-lg font-semibold text-indigo-100">
          {nickname}
        </span>
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={clsx(
            "shrink-0 text-indigo-200/80 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        >
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <nav
          role="menu"
          className="font-doc-popup absolute right-0 top-[calc(100%+0.5rem)] z-[120] w-56 -rotate-1 rounded-sm border border-amber-200 bg-amber-50 shadow-[2px_4px_12px_rgba(120,90,20,0.18)]"
        >
          <span
            aria-hidden="true"
            className="absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 rotate-2 rounded-[2px] bg-amber-200/70 shadow-sm"
          />

          <p className="font-doc-translation flex flex-wrap items-center gap-1 border-b border-dashed border-amber-300 px-4 pb-3 pt-4 text-sm font-bold leading-snug text-amber-800">
            <span className="rounded-md bg-[#0a1030] px-2 py-0.5 text-sm font-semibold text-white">
              {nickname}
            </span>
            <span>님 안녕하세요</span>
          </p>

          <Link
            href="/profile"
            role="menuitem"
            onClick={handleClose}
            className="flex w-full items-center gap-3 border-b border-dashed border-amber-300 px-4 py-3 text-sm text-zinc-700 transition-colors hover:bg-amber-100/70"
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20c0-3.3 3.6-5 8-5s8 1.7 8 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            개인정보 변경
          </Link>

          <Link
            href="/bookmarks"
            role="menuitem"
            onClick={handleClose}
            className="flex w-full items-center gap-3 border-b border-dashed border-amber-300 px-4 py-3 text-sm text-zinc-700 transition-colors hover:bg-amber-100/70"
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            북마크
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-b-sm px-4 py-3 text-sm text-red-600 transition-colors hover:bg-red-100/60"
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            로그아웃
          </button>
        </nav>
      )}
    </div>
  );
};
