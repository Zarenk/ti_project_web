import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const url = new URL(backendUrl);
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: url.protocol.replace(":", ""),
        hostname: url.hostname,
        port: url.port || "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
