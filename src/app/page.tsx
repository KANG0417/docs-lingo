import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { BrandSection } from "@/components/organisms/brand/brand-section";
import { LoginSection } from "@/components/organisms/auth/login-section";
import { MainTemplate } from "@/components/templates/landing/main-template";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "독스링고 - 문서와 언어를 잇다",
  description: "가장 빠르고 정확한 문서 번역 경험, 독스링고에서 시작하세요.",
};

const HomePage = async (): Promise<ReactElement> => {
  const session = await auth();

  if (session?.user) {
    redirect("/main");
  }

  return (
    <MainTemplate brandSlot={<BrandSection />} loginSlot={<LoginSection />} />
  );
};

export default HomePage;
