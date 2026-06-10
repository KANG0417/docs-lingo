import { signIn, signOut } from "next-auth/react";
import type { SnsProviderId } from "@/types/auth";

export const signInWithSns = async (provider: SnsProviderId): Promise<void> => {
  await signIn(provider, { redirectTo: "/main" });
};

export const signOutFromSns = async (): Promise<void> => {
  await signOut({ redirectTo: "/" });
};
