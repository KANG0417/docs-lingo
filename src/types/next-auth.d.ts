import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    sessionExpiresAt?: number;
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sessionVersion?: number;
    sessionExpiresAt?: number;
  }
}
