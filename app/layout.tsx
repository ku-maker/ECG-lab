import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECG Lab — リアルタイム心電図シミュレーター",
  description:
    "医療従事者・医学生向けのリアルタイム心電図（ECG）学習Webアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
