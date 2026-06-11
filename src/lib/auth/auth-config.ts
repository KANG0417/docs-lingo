import type { NextAuthConfig } from "next-auth";

// 미들웨어(proxy)에서도 사용하는 edge-safe 공통 설정.
// 어댑터/프로바이더처럼 Node 전용 의존성은 lib/auth.ts에서만 추가한다.
export const authConfig = {
  providers: [],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    session: ({ session, token }) => {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    authorized: ({ auth }) => {
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
