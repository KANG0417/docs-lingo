"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { BrandLogo } from "@/components/atoms/logo/brand-logo";
import { UserMenu } from "@/components/molecules/menu/user-menu";
import { AUTH_SIGNOUT_PATH } from "@/constants/auth";
import { NAVBAR_SCROLL_THRESHOLD } from "@/constants/scroll";
import { useWindowScroll } from "@/hooks/use-window-scroll";

interface NavbarProps {
  nickname: string;
  image: string | null;
  sessionExpiresAt?: number;
}

export const Navbar = ({
  nickname,
  image,
  sessionExpiresAt,
}: NavbarProps): ReactElement => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const { isPastThreshold } = useWindowScroll({
    threshold: NAVBAR_SCROLL_THRESHOLD,
  });
  const showNavbarSurface = isPastThreshold || isUserMenuOpen;

  useEffect(() => {
    if (typeof sessionExpiresAt !== "number") {
      return;
    }

    const expiresInMs = sessionExpiresAt * 1000 - Date.now();

    if (expiresInMs <= 0) {
      window.location.assign(AUTH_SIGNOUT_PATH);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.location.assign(AUTH_SIGNOUT_PATH);
    }, expiresInMs);

    return () => window.clearTimeout(timeoutId);
  }, [sessionExpiresAt]);

  return (
    <header
      className={clsx(
        "sticky top-0 overflow-visible transition-[background-color,box-shadow,border-color,z-index] duration-200",
        isUserMenuOpen ? "z-[110]" : "z-50",
        showNavbarSurface &&
          "border-b border-white/10 bg-[#0a1030]/95 shadow-[0_4px_20px_rgba(0,0,0,0.25)] backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex h-24 w-full max-w-6xl items-center justify-between px-9">
        <Link href="/main" aria-label="독스링고 메인으로 이동">
          <BrandLogo />
        </Link>
        <UserMenu
          nickname={nickname}
          image={image}
          onOpenChange={setIsUserMenuOpen}
        />
      </div>
    </header>
  );
};
