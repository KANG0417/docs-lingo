import { signOut } from "@/lib/auth/auth";

export const GET = async (): Promise<Response> => {
  return signOut({ redirectTo: "/" });
};
