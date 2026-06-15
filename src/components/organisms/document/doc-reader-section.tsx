"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { LoadingBar } from "@/components/atoms/feedback/loading-bar";
import { OfficialDocumentNotice } from "@/components/molecules/document/official-document-notice";
import { TranslationHistoryPanel } from "@/components/organisms/document/translation-history-panel";
import { TranslationResultSection } from "@/components/organisms/document/translation-result-section";
import {
  isOfficialDocumentOnlyMessage,
} from "@/constants/official-document";
import {
  TEXT_READING_LOADING_MESSAGES,
  URL_TRANSLATION_LOADING_MESSAGES,
} from "@/constants/translation-loading-messages";
import { useDocumentReader } from "@/hooks/use-document-reader";
import type { DocInputMode } from "@/types/document";
import type { DocumentTranslationResult } from "@/types/translation";

const INPUT_MODES: { id: DocInputMode; label: string }[] = [
  { id: "url", label: "URL 입력" },
  { id: "text", label: "텍스트 입력" },
];

const isPersistedTranslation = (translationId: string): boolean => {
  return (
    translationId !== "local-text" &&
    translationId !== "local-pagination" &&
    translationId !== "local-untranslated"
  );
};

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
    clearTranslationResult,
    clearErrorMessage,
  } = useDocumentReader();

  const [urlInput, setUrlInput] = useState<string>("");
  const [textInput, setTextInput] = useState<string>("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState<number>(0);
  const translationResultRef = useRef<HTMLDivElement>(null);
  const wasLoadingRef = useRef<boolean>(false);

  useEffect(() => {
    const shouldScrollToResult =
      wasLoadingRef.current &&
      !isLoading &&
      translationResult &&
      translationResultRef.current;

    wasLoadingRef.current = isLoading;

    if (shouldScrollToResult) {
      translationResultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isLoading, translationResult]);

  useEffect(() => {
    if (translationResult && isPersistedTranslation(translationResult.id)) {
      setHistoryRefreshKey((prev) => prev + 1);
    }
  }, [translationResult]);

  const handleUrlInputChange = (value: string): void => {
    setUrlInput(value);

    if (!value.trim()) {
      clearErrorMessage();
    }
  };

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

  const handleDeletedTranslation = (translationId: string): void => {
    if (translationResult?.id === translationId) {
      clearTranslationResult();
    }
  };

  const isOfficialDocNotice = isOfficialDocumentOnlyMessage(errorMessage);
  const shouldShowOfficialDocumentGuide =
    mode === "url" &&
    !isLoading &&
    !translationResult &&
    !(isOfficialDocNotice && errorMessage);

  return (
    <section
      aria-label="문서 읽기"
      className="flex w-full flex-col gap-8"
    >
      <header className="flex flex-col gap-0.5 text-center">
        <h1 className="font-doc-title text-[2.375rem] font-extrabold tracking-tight text-white">
          오늘은 어떤 문서를 읽을까요?
        </h1>
        <p className="font-doc-aux text-[1.375rem] text-indigo-200/70">
          공식 문서 주소를 입력하거나 텍스트를 입력해주세요.
        </p>
      </header>

      <div className="doc-reader-layout grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-12">
        <div className="doc-reader-main flex max-w-full flex-col gap-6">
          <div className="doc-reader-memo-tilt relative">
            <span
              aria-hidden="true"
              className="absolute -top-3 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rotate-2 rounded-[2px] bg-indigo-200/40 shadow-sm backdrop-blur-sm"
            />

            <div className="memo-lines rounded-sm border border-amber-200 bg-amber-50 shadow-[4px_8px_24px_rgba(0,0,0,0.45)]">
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
                      "rounded-md border-2 px-4 py-2 text-sm font-semibold transition-colors",
                      mode === inputMode.id
                        ? "border-[#0a1030] bg-[#0a1030] text-indigo-100 shadow-sm ring-2 ring-[#0a1030] ring-offset-1 ring-offset-amber-100/80"
                        : "border-transparent text-amber-800/70 hover:text-amber-900",
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
                    onChange={(event) => handleUrlInputChange(event.target.value)}
                    placeholder="https://example.com/docs"
                    required
                    disabled={isLoading}
                    className="doc-reader-field doc-reader-field--url"
                  />
                ) : (
                  <textarea
                    value={textInput}
                    onChange={(event) => setTextInput(event.target.value)}
                    placeholder="읽을 텍스트를 붙여넣어 주세요."
                    required
                    disabled={isLoading}
                    rows={10}
                    className="font-doc-body memo-lines doc-reader-field doc-reader-field--textarea"
                  />
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-11 w-full items-center justify-center rounded-md bg-[#0a1030] text-sm font-semibold text-indigo-100 transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#141c4a] hover:shadow-lg active:translate-y-0 disabled:bg-[#0a1030]/40 sm:w-36 sm:self-end"
                >
                  {isLoading
                    ? mode === "url"
                      ? "번역 중..."
                      : "읽는 중..."
                    : mode === "url"
                      ? "번역하기"
                      : "문서 읽기"}
                </button>

                {mode === "url" && isOfficialDocNotice && errorMessage && (
                  <OfficialDocumentNotice live="polite" />
                )}

                {shouldShowOfficialDocumentGuide && <OfficialDocumentNotice />}
              </form>

              {isLoading && (
                <div className="mt-5">
                  <LoadingBar
                    messages={
                      mode === "url"
                        ? URL_TRANSLATION_LOADING_MESSAGES
                        : TEXT_READING_LOADING_MESSAGES
                    }
                  />
                </div>
              )}

              {errorMessage && !isOfficialDocNotice && (
                <p
                  role="alert"
                  className="font-doc-aux mt-5 w-full whitespace-pre-line rounded-md border border-dashed border-red-400 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-600"
                >
                  {errorMessage}
                </p>
              )}
            </div>
          </div>

          {translationResult && !isLoading && (
            <div ref={translationResultRef} className="overflow-visible">
              <TranslationResultSection
                result={translationResult}
                isMemoTilted
              />
            </div>
          )}
        </div>

        <TranslationHistoryPanel
          selectedTranslationId={translationResult?.id ?? null}
          onSelectHistory={handleSelectHistory}
          onDeletedTranslation={handleDeletedTranslation}
          refreshKey={historyRefreshKey}
        />
      </div>
    </section>
  );
};
