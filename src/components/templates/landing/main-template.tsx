import type { ReactElement, ReactNode } from "react";

interface MainTemplateProps {
  brandSlot: ReactNode;
  loginSlot: ReactNode;
}

export const MainTemplate = ({
  brandSlot,
  loginSlot,
}: MainTemplateProps): ReactElement => {
  return (
    <main className="flex min-h-dvh w-full flex-row">
      <section aria-label="서비스 소개" className="relative min-h-dvh flex-1">
        {brandSlot}
      </section>
      <section
        aria-label="로그인"
        className="flex min-h-dvh w-[40%] max-w-[480px] items-center justify-center bg-white px-6 py-14 lg:px-12"
      >
        {loginSlot}
      </section>
    </main>
  );
};
