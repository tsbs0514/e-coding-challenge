import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages deployment settings
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true, // For static export
  },
  // GitHub Pages subdirectory deployment
  basePath: "/e-coding-challenge",
  assetPrefix: "/e-coding-challenge/",
};

export default nextConfig;
