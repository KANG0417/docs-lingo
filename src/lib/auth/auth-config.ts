import type { NextAuthConfig } from "next-auth";
import { SESSION_MAX_AGE_SECONDS } from "@/constants/auth";
import { isSessionExpiredAt } from "@/lib/auth/session-expiration";

// 미들웨어(proxy)에서도 사용하는 edge-safe 공통 설정.
// 어댑터/프로바이더처럼 Node 전용 의존성은 lib/auth.ts에서만 추가한다.
export const authConfig = {
  providers: [],
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    // 0 → 매 요청 jwt 콜백(session_version 검증). exp 연장은 jwt 콜백에서 막음
    updateAge: 0,
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    session: ({ session, token }) => {
      const now = Math.floor(Date.now() / 1000);
      const isExpired =
        (typeof token.exp === "number" && token.exp <= now) ||
        isSessionExpiredAt(token.sessionExpiresAt, now);

      if (isExpired) {
        return session;
      }

      if (token.sub) {
        session.user.id = token.sub;
      }

      if (typeof token.sessionExpiresAt === "number") {
        session.sessionExpiresAt = token.sessionExpiresAt;
      }

      return session;
    },
    authorized: ({ auth }) => {
      return Boolean(auth?.user?.id);
    },
  },
} satisfies NextAuthConfig;
