import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Prisma 必须在运行时从 node_modules 加载，不能被 Turbopack 打包进 chunk
  serverExternalPackages: ["@prisma/client", "@prisma/engines"],
};

export default nextConfig;
