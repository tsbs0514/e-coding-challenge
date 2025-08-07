import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages deployment settings
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true, // For static export
  },
  // If deploying to a subdirectory, uncomment and adjust basePath and assetPrefix
  // basePath: '/e-coding-challenge',
  // assetPrefix: '/e-coding-challenge/',
};

export default nextConfig;
