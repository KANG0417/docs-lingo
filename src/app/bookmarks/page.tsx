import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { BookmarksSection } from "@/components/organisms/bookmark/bookmarks-section";
import { Navbar } from "@/components/organisms/header/navbar";
import { DashboardTemplate } from "@/components/templates/dashboard/dashboard-template";
import { auth } from "@/lib/auth/auth";
import { getDisplayProfile } from "@/lib/profile/get-display-profile";

export const metadata: Metadata = {
  title: "독스링고 - 북마크",
  description: "저장한 문서를 확인하고 번역 내용을 다시 볼 수 있습니다.",
};

const BookmarksPage = async (): Promise<ReactElement> => {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const displayProfile = await getDisplayProfile(session);

  return (
    <DashboardTemplate
      navbarSlot={
        <Navbar
          nickname={displayProfile.nickname}
          image={displayProfile.image}
          sessionExpiresAt={session.sessionExpiresAt}
        />
      }
    >
      <section
        aria-label="북마크"
        className="flex w-full flex-col items-center gap-8"
      >
        <header className="bookmarks-page-header">
          <h1 className="font-doc-title text-[2.125rem] font-extrabold tracking-tight text-white sm:text-[2.375rem]">
            북마크
          </h1>
          <p className="font-doc-aux text-base text-indigo-200/80 sm:text-lg">
            폴더로 정리하고, 메모를 끌어다 놓아 저장할 수 있습니다.
          </p>
        </header>

        <BookmarksSection />
      </section>
    </DashboardTemplate>
  );
};

export default BookmarksPage;
