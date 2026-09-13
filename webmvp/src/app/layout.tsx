import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";

import { ClientProviders } from "@/components/ClientProviders";
import { themeInitScript } from "@/lib/theme";

import "./globals.css";
import "./lf-theme.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LF Chords",
  description: "Worship chord charts with transpose and playlists",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "LF Chords",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} min-h-screen overflow-x-hidden antialiased pt-[env(safe-area-inset-top)] pr-[max(0px,env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)] pl-[max(0px,env(safe-area-inset-left))]`}
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
