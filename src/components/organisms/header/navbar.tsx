import Link from "next/link";
import type { ReactElement } from "react";
import { BrandLogo } from "@/components/atoms/logo/brand-logo";
import { UserMenu } from "@/components/molecules/menu/user-menu";

interface NavbarProps {
  nickname: string;
  image: string | null;
}

export const Navbar = ({ nickname, image }: NavbarProps): ReactElement => {
  return (
    <header className="sticky top-0 z-10">
      <div className="mx-auto flex h-24 w-full max-w-6xl items-center justify-between px-9">
        <Link href="/main" aria-label="독스링고 메인으로 이동">
          <BrandLogo />
        </Link>
        <UserMenu nickname={nickname} image={image} />
      </div>
    </header>
  );
};
