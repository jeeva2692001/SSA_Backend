import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["typeorm", "pg", "bcryptjs"],
  turbopack: {},
};

export default nextConfig;

