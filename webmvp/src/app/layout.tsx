import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "LF ChordApp",
  description: "Chord transposition web MVP",
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen overflow-x-hidden antialiased pt-[env(safe-area-inset-top)] pr-[max(0px,env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)] pl-[max(0px,env(safe-area-inset-left))]`}
      >
        {children}
      </body>
    </html>
  );
}
