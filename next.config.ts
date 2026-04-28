import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    localPatterns: [
      {
        pathname: "/games/**/thumbnail.png",
        search: "?v=20260428",
      },
    ],
  },
  reactCompiler: true,
};

export default nextConfig;
