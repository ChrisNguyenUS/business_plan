import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingRoot: path.join(process.cwd(), "../../"),
  turbopack: {
    root: path.join(process.cwd(), "../../"),
  },
};

export default nextConfig;
