import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { Navbar } from "@/components/organisms/header/navbar";
import { DashboardTemplate } from "@/components/templates/dashboard/dashboard-template";
import { auth } from "@/lib/auth/auth";
import { getDisplayProfile } from "@/lib/profile/get-display-profile";

export const metadata: Metadata = {
  title: "독스링고 - 북마크",
  description: "저장한 문서를 폴더별로 관리하세요.",
};

const BookmarksPage = async (): Promise<ReactElement> => {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const displayProfile = await getDisplayProfile(session);

  return (
    <DashboardTemplate
      navbarSlot={
        <Navbar
          nickname={displayProfile.nickname}
          image={displayProfile.image}
        />
      }
    >
      <section
        aria-label="북마크"
        className="flex w-full flex-col items-center gap-8"
      >
        <header className="flex flex-col gap-0.5 text-center">
          <h1 className="font-doc-title text-[2.375rem] font-extrabold tracking-tight text-white">
            북마크
          </h1>
          <p className="font-doc-aux text-[1.375rem] text-indigo-200/70">
            저장한 문서를 폴더별로 관리할 수 있습니다.
          </p>
        </header>

        <div className="relative w-full max-w-3xl -rotate-1">
          <span
            aria-hidden="true"
            className="absolute -top-3 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rotate-2 rounded-[2px] bg-indigo-200/40 shadow-sm backdrop-blur-sm"
          />
          <div className="flex flex-col items-center gap-3 rounded-sm border border-amber-200 bg-amber-50 px-6 py-16 text-center shadow-[4px_8px_24px_rgba(0,0,0,0.45)]">
            <p className="font-doc-aux text-sm font-bold text-amber-800">
              아직 저장한 북마크가 없습니다.
            </p>
            <p className="font-doc-aux text-xs text-amber-700/60">
              문서를 읽고 북마크에 추가하면 이 메모지에 기록됩니다.
            </p>
          </div>
        </div>
      </section>
    </DashboardTemplate>
  );
};

export default BookmarksPage;
