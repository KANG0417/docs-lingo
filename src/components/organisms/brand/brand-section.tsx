import type { ReactElement } from "react";
import { TypingText } from "@/components/atoms/text/typing-text";
import { InteractiveBackground } from "@/components/organisms/background/interactive-background";

export const BrandSection = (): ReactElement => {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-violet-950">
      <InteractiveBackground />

      <header className="pointer-events-none relative z-10 flex flex-col items-center gap-6 px-8 text-center lg:items-start lg:text-left">
        <hgroup className="flex flex-col items-center gap-6 lg:items-start">
          <h1 className="text-6xl font-extrabold leading-tight tracking-tight lg:text-7xl">
            <TypingText
              text="DOCS-LINGO"
              className="bg-gradient-to-r from-indigo-200 via-white to-violet-200 bg-clip-text text-transparent"
              cursorClassName="bg-indigo-200"
              pauseAfterTypedMs={3600}
            />
          </h1>
          <p className="font-doc-aux max-w-md text-lg leading-relaxed text-indigo-200/80">
            문서와 언어를 잇다.
            <br />
            가장 빠르고 정확한 문서 번역 경험을 시작하세요.
          </p>
        </hgroup>
      </header>
    </div>
  );
};
