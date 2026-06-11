import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { DocReaderSection } from "@/components/organisms/document/doc-reader-section";
import { Navbar } from "@/components/organisms/header/navbar";
import { DashboardTemplate } from "@/components/templates/dashboard/dashboard-template";
import { auth } from "@/lib/auth/auth";
import { getDisplayProfile } from "@/lib/profile/get-display-profile";

export const metadata: Metadata = {
  title: "독스링고 - 문서 읽기",
  description: "URL 문서를 한글로 번역하고 핵심 키워드를 정리하세요.",
};

const MainPage = async (): Promise<ReactElement> => {
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
      <DocReaderSection />
    </DashboardTemplate>
  );
};

export default MainPage;
