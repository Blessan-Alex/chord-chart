import type { NextConfig } from "next";

const firebaseProjectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "song-db-5e4ed";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${firebaseProjectId}.firebaseapp.com/__/auth/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/sessions",
        destination: "/playlists",
        permanent: true,
      },
      {
        source: "/sessions/:path*",
        destination: "/playlists/:path*",
        permanent: true,
      },
      {
        source: "/admin/songs",
        destination: "/admin",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
