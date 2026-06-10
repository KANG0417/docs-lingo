"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/atoms/avatar/user-avatar";
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { signOutFromSns } from "@/services/auth-service";

interface UserMenuProps {
  nickname: string;
  image: string | null;
}

export const UserMenu = ({ nickname, image }: UserMenuProps): ReactElement => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleToggle = (): void => {
    setIsOpen((prev) => !prev);
  };

  const handleClose = (): void => {
    setIsOpen(false);
  };

  const handleSignOut = (): void => {
    void signOutFromSns();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-3.5 rounded-full py-2 pl-2 pr-6 transition-colors hover:bg-white/10"
      >
        <UserAvatar nickname={nickname} image={image} size="sm" />
        <span className="text-xl font-semibold text-indigo-100">{nickname}</span>
      </button>

      {isOpen && (
        <nav
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-52 -rotate-1 rounded-sm border border-amber-200 bg-amber-50 shadow-[2px_4px_12px_rgba(120,90,20,0.18)]"
        >
          {/* 메모지 상단 테이프 */}
          <span
            aria-hidden="true"
            className="absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 rotate-2 rounded-[2px] bg-amber-200/70 shadow-sm"
          />

          <p className="border-b border-dashed border-amber-300 px-4 pb-2.5 pt-4 text-xs font-bold tracking-wide text-amber-700">
            {nickname}님 안녕하세요
          </p>

          <Link
            href="/profile"
            role="menuitem"
            onClick={handleClose}
            className="flex w-full items-center gap-2.5 border-b border-dashed border-amber-300 px-4 py-3 text-sm text-zinc-700 transition-colors hover:bg-amber-100/70"
          >
            <svg
              width={16}
              height={16}
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
            className="flex w-full items-center gap-2.5 border-b border-dashed border-amber-300 px-4 py-3 text-sm text-zinc-700 transition-colors hover:bg-amber-100/70"
          >
            <svg
              width={16}
              height={16}
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
            className="flex w-full items-center gap-2.5 rounded-b-sm px-4 py-3 text-sm text-red-600 transition-colors hover:bg-red-100/60"
          >
            <svg
              width={16}
              height={16}
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
