import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["typeorm", "pg", "bcryptjs"],
  // Auto-reload to pick up updated Project and Client column definitions
};

export default nextConfig;
