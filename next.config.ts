import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    localPatterns: [
      {
        pathname: "/games/**/thumbnail.png",
      },
    ],
  },
  reactCompiler: true,
};

export default nextConfig;
