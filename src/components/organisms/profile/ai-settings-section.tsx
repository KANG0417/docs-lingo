"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import {
  AI_PROVIDER_OPTIONS,
  DEFAULT_AI_PROVIDER,
} from "@/constants/ai-providers";
import { useAiSettings } from "@/hooks/use-ai-settings";
import type { AiProvider } from "@/types/ai-settings";

export const AiSettingsSection = (): ReactElement => {
  const {
    settings,
    isLoading,
    isSaving,
    errorMessage,
    successMessage,
    saveSettings,
  } = useAiSettings();

  const [provider, setProvider] = useState<AiProvider>(DEFAULT_AI_PROVIDER);
  const [apiKey, setApiKey] = useState<string>("");

  const selectedProvider = AI_PROVIDER_OPTIONS.find(
    (option) => option.id === provider,
  );

  useEffect(() => {
    if (!settings) return;

    setProvider(settings.provider);
    setApiKey("");
  }, [settings]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    void saveSettings({
      provider,
      apiKey: apiKey.trim() || undefined,
    });
  };

  const handleClearApiKey = (): void => {
    void saveSettings({
      provider,
      clearApiKey: true,
    });
    setApiKey("");
  };

  return (
    <section
      aria-label="AI 도구 설정"
      className="relative w-full max-w-3xl rotate-[0.4deg]"
    >
      <span
        aria-hidden="true"
        className="absolute -top-3 left-1/2 z-10 h-6 w-24 -translate-x-1/2 -rotate-2 rounded-[2px] bg-indigo-200/40 shadow-sm backdrop-blur-sm"
      />

      <div className="rounded-sm border border-amber-200 bg-amber-50 p-6 shadow-[4px_8px_24px_rgba(0,0,0,0.45)]">
        <header className="mb-5 border-b border-dashed border-amber-300 pb-4 text-center">
          <h2 className="text-lg font-bold text-amber-900">AI 도구 설정</h2>
          <p className="mt-1 text-sm text-amber-700/80">
            API 키만 등록하면 모델은 자동으로 선택됩니다.
          </p>
        </header>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-amber-700/70">
            AI 설정을 불러오는 중...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-amber-900">
                AI 제공자
              </span>
              <select
                value={provider}
                onChange={(event) =>
                  setProvider(event.target.value as AiProvider)
                }
                disabled={isSaving}
                className="h-12 w-full rounded-md border border-dashed border-amber-400 bg-white/80 px-4 text-sm text-zinc-900 focus:border-solid focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-amber-100/50"
              >
                {AI_PROVIDER_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-amber-900">
                API 키
              </span>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={
                  settings?.hasApiKey
                    ? `등록됨 (${settings.maskedApiKey}) - 변경 시 새 키 입력`
                    : "Google AI Studio API 키를 입력하세요"
                }
                disabled={isSaving}
                className="h-12 w-full rounded-md border border-dashed border-amber-400 bg-white/80 px-4 text-sm text-zinc-900 placeholder:text-amber-700/40 focus:border-solid focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-amber-100/50"
              />
              {selectedProvider && (
                <a
                  href={selectedProvider.apiKeyGuideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 underline underline-offset-2"
                >
                  API 키 발급 방법 보기
                </a>
              )}
            </label>

            <div className="rounded-md border border-dashed border-amber-300 bg-white/70 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">모델 자동 선택</p>
              <p className="mt-1 text-xs text-amber-700/80">
                Gemini API에서 사용 가능한 모델을 조회한 뒤, 가장 적합한
                Flash-Lite 모델부터 순서대로 시도합니다.
              </p>
            </div>

            {successMessage && (
              <p
                role="status"
                className="rounded-md border border-dashed border-emerald-400 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              >
                {successMessage}
              </p>
            )}

            {errorMessage && (
              <p
                role="alert"
                className="rounded-md border border-dashed border-red-400 bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {errorMessage}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              {settings?.hasApiKey && (
                <button
                  type="button"
                  onClick={handleClearApiKey}
                  disabled={isSaving}
                  className="flex h-11 items-center justify-center rounded-md border border-amber-300 bg-white px-5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  API 키 삭제
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="flex h-11 items-center justify-center rounded-md bg-[#0a1030] px-6 text-sm font-semibold text-indigo-100 transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#141c4a] hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#0a1030]/40"
              >
                {isSaving ? "저장 중..." : "AI 설정 저장"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};
