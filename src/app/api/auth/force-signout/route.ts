import { signOut } from "@/lib/auth";

export const GET = async (): Promise<Response> => {
  return signOut({ redirectTo: "/" });
};
