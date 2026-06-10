"use client";

import { useEffect, useState } from "react";
import {
  getUserAiSettings,
  updateUserAiSettings,
} from "@/services/ai-settings-client-service";
import type {
  UpdateUserAiSettingsPayload,
  UserAiSettings,
} from "@/types/ai-settings";

interface UseAiSettingsReturn {
  settings: UserAiSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  saveSettings: (payload: UpdateUserAiSettingsPayload) => Promise<void>;
}

export const useAiSettings = (): UseAiSettingsReturn => {
  const [settings, setSettings] = useState<UserAiSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const loadedSettings = await getUserAiSettings();
        setSettings(loadedSettings);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "AI 설정을 불러오지 못했습니다.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const saveSettings = async (
    payload: UpdateUserAiSettingsPayload,
  ): Promise<void> => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const savedSettings = await updateUserAiSettings(payload);
      setSettings(savedSettings);
      setSuccessMessage("AI 도구 설정이 저장되었습니다.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "AI 설정 저장에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    isLoading,
    isSaving,
    errorMessage,
    successMessage,
    saveSettings,
  };
};
