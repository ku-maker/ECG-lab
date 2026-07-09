import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "ECG Lab",
  description: "リアルタイム心電図シミュレーター",
  applicationName: "ECG Lab",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
  openGraph: {
    title: "ECG Lab",
    description: "リアルタイム心電図シミュレーター",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "ECG Lab",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ECG Lab",
    description: "リアルタイム心電図シミュレーター",
    images: ["/og-image.svg"],
  },
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
