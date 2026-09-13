import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
