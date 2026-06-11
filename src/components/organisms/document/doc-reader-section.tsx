"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { LoadingBar } from "@/components/atoms/feedback/loading-bar";
import { TranslationHistoryPanel } from "@/components/organisms/document/translation-history-panel";
import { TranslationResultSection } from "@/components/organisms/document/translation-result-section";
import { useDocumentReader } from "@/hooks/use-document-reader";
import type { DocInputMode } from "@/types/document";
import type { DocumentTranslationResult } from "@/types/translation";

const INPUT_MODES: { id: DocInputMode; label: string }[] = [
  { id: "url", label: "URL 입력" },
  { id: "text", label: "텍스트 입력" },
];

export const DocReaderSection = (): ReactElement => {
  const {
    mode,
    isLoading,
    translationResult,
    errorMessage,
    changeMode,
    readFromUrl,
    readFromText,
    selectHistoryItem,
  } = useDocumentReader();

  const [urlInput, setUrlInput] = useState<string>("");
  const [textInput, setTextInput] = useState<string>("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState<number>(0);

  useEffect(() => {
    if (translationResult && translationResult.id !== "local-text") {
      setHistoryRefreshKey((prev) => prev + 1);
    }
  }, [translationResult]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (mode === "url" && urlInput.trim()) {
      void readFromUrl(urlInput.trim());
    }

    if (mode === "text" && textInput.trim()) {
      void readFromText(textInput.trim());
    }
  };

  const handleSelectHistory = (item: DocumentTranslationResult): void => {
    selectHistoryItem(item);
  };

  return (
    <section
      aria-label="문서 읽기"
      className="flex w-full flex-col items-center gap-8"
    >
      <header className="flex flex-col gap-0.5 text-center">
        <h1 className="text-[2.375rem] font-extrabold tracking-tight text-white">
          오늘은 어떤 문서를 읽을까요?
        </h1>
        <p className="text-[1.375rem] text-indigo-200/70">
          공식 문서 주소를 입력하거나 텍스트를 입력해주세요.
        </p>
      </header>

      <div className="grid w-full max-w-6xl grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="relative w-full -rotate-1 transition-transform duration-300 hover:rotate-0">
          <span
            aria-hidden="true"
            className="absolute -top-3 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rotate-2 rounded-[2px] bg-indigo-200/40 shadow-sm backdrop-blur-sm"
          />

          <div className="rounded-sm border border-amber-200 bg-amber-50 p-6 shadow-[4px_8px_24px_rgba(0,0,0,0.45)]">
            <div
              role="tablist"
              aria-label="입력 방식 선택"
              className="mb-5 flex w-fit gap-1 rounded-lg bg-amber-100/80 p-1"
            >
              {INPUT_MODES.map((inputMode) => (
                <button
                  key={inputMode.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === inputMode.id}
                  onClick={() => changeMode(inputMode.id)}
                  className={clsx(
                    "rounded-md px-4 py-2 text-sm font-semibold transition-colors",
                    mode === inputMode.id
                      ? "bg-[#0a1030] text-indigo-100 shadow-sm"
                      : "text-amber-800/70 hover:text-amber-900",
                  )}
                >
                  {inputMode.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === "url" ? (
                <input
                  type="url"
                  value={urlInput}
                  onChange={(event) => setUrlInput(event.target.value)}
                  placeholder="https://example.com/docs"
                  required
                  disabled={isLoading}
                  className="h-12 w-full rounded-md border border-dashed border-amber-400 bg-white/80 px-4 text-sm text-zinc-900 placeholder:text-amber-700/40 focus:border-solid focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-amber-100/50"
                />
              ) : (
                <textarea
                  value={textInput}
                  onChange={(event) => setTextInput(event.target.value)}
                  placeholder="읽을 텍스트를 붙여넣어 주세요."
                  required
                  disabled={isLoading}
                  rows={12}
                  className="memo-lines w-full resize-none overflow-y-auto rounded-md border border-dashed border-amber-400 bg-white/80 p-4 text-sm leading-[28px] text-zinc-900 placeholder:text-amber-700/40 focus:border-solid focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-amber-100/50"
                />
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex h-11 w-full items-center justify-center rounded-md bg-[#0a1030] text-sm font-semibold text-indigo-100 transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#141c4a] hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#0a1030]/40 sm:w-36 sm:self-end"
              >
                {isLoading
                  ? mode === "url"
                    ? "번역 중..."
                    : "읽는 중..."
                  : mode === "url"
                    ? "번역하기"
                    : "문서 읽기"}
              </button>
            </form>

            {isLoading && (
              <div className="mt-5">
                <LoadingBar
                  message={mode === "url" ? "번역중입니다..." : "읽는중입니다..."}
                />
              </div>
            )}

            {errorMessage && (
              <p
                role="alert"
                className="mt-5 whitespace-pre-line rounded-md border border-dashed border-red-400 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-600"
              >
                {errorMessage}
              </p>
            )}
          </div>
        </div>

        <TranslationHistoryPanel
          selectedTranslationId={translationResult?.id ?? null}
          onSelectHistory={handleSelectHistory}
          refreshKey={historyRefreshKey}
        />
      </div>

      {translationResult && !isLoading && (
        <div className="w-full max-w-6xl">
          <TranslationResultSection result={translationResult} />
        </div>
      )}
    </section>
  );
};
