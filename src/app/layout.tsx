import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Build Websites With AI`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Describe your idea. WebForge AI designs, writes, builds and deploys production-ready websites in minutes.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  openGraph: {
    title: `${APP_NAME} — Build Websites With AI`,
    description: "Describe your idea. Let AI design, code and launch your website in minutes.",
    siteName: APP_NAME,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-ink">
      <body className="bg-ink text-zinc-100 font-body antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
