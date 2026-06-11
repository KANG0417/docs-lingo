import type { ReactElement, ReactNode } from "react";
import { ScrollToTopButton } from "@/components/atoms/button/scroll-to-top-button";

interface DashboardTemplateProps {
  navbarSlot: ReactNode;
  children: ReactNode;
}

export const DashboardTemplate = ({
  navbarSlot,
  children,
}: DashboardTemplateProps): ReactElement => {
  return (
    <div className="space-bg flex min-h-dvh flex-col">
      {navbarSlot}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        {children}
      </main>
      <ScrollToTopButton />
    </div>
  );
};
