import type {
  UpdateUserAiSettingsPayload,
  UserAiSettings,
} from "@/types/ai-settings";

export const getUserAiSettings = async (): Promise<UserAiSettings> => {
  const response = await fetch("/api/profile/ai-settings");

  if (!response.ok) {
    const { message } = (await response.json()) as { message: string };
    throw new Error(message);
  }

  return (await response.json()) as UserAiSettings;
};

export const updateUserAiSettings = async (
  payload: UpdateUserAiSettingsPayload,
): Promise<UserAiSettings> => {
  const response = await fetch("/api/profile/ai-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const { message } = (await response.json()) as { message: string };
    throw new Error(message);
  }

  return (await response.json()) as UserAiSettings;
};
