import type { SnsProvider } from "@/types/auth";

export const SNS_PROVIDERS: SnsProvider[] = [
  {
    id: "google",
    label: "Google로 계속하기",
    className:
      "bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100",
  },
  {
    id: "kakao",
    label: "카카오로 계속하기",
    className:
      "bg-[#FEE500] text-[#191919] hover:bg-[#f5dc00] active:bg-[#ebd300]",
  },
  {
    id: "naver",
    label: "네이버로 계속하기",
    className:
      "bg-[#03C75A] text-white hover:bg-[#02b351] active:bg-[#02a04a]",
  },
  {
    id: "github",
    label: "GitHub로 계속하기",
    className:
      "bg-[#181717] text-white hover:bg-[#2b2a2a] active:bg-[#3d3c3c]",
  },
];
