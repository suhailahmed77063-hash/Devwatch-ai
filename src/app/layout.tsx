import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = "https://devwatch-ai.vercel.app";

export const metadata: Metadata = {
  title: "DevWatch AI - Engineering Intelligence Platform",
  description: "AI-powered development team monitoring, code review, security scanning, and release readiness analysis.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/logo.png",
  },
  openGraph: {
    title: "DevWatch AI - Engineering Intelligence Platform",
    description: "AI-powered development team monitoring, code review, security scanning, and release readiness analysis.",
    url: APP_URL,
    siteName: "DevWatch AI",
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "DevWatch AI",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DevWatch AI - Engineering Intelligence Platform",
    description: "AI-powered development team monitoring, code review, security scanning, and release readiness analysis.",
    images: [`${APP_URL}/og-image.png`],
  },
  metadataBase: new URL(APP_URL),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta property="og:image" content={`${APP_URL}/og-image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="DevWatch AI" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={`${APP_URL}/og-image.png`} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
