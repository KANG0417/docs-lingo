import { signIn } from "next-auth/react";
import { AUTH_SIGNOUT_PATH, POST_LOGIN_REDIRECT } from "@/constants/auth";
import type { SnsProviderId } from "@/types/auth";

export const signInWithSns = async (provider: SnsProviderId): Promise<void> => {
  await signIn(provider, {
    redirectTo: POST_LOGIN_REDIRECT,
  });
};

export const signOutFromSns = (): void => {
  window.location.assign(AUTH_SIGNOUT_PATH);
};
