import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  fontDocBody,
  fontDocTitle,
  fontDocTranslation,
  fontDocTranslationBold,
} from "@/lib/fonts/fonts";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "독스링고",
  description: "가장 빠르고 정확한 문서 번역 경험, 독스링고에서 시작하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${fontDocBody.variable} ${fontDocTitle.variable} ${fontDocTranslation.variable} ${fontDocTranslationBold.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
