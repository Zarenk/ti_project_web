import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

// `NEXT_PUBLIC_IMAGE_HOSTS` can list extra allowed hosts separated by commas.
// If not provided, it falls back to `NEXT_PUBLIC_BACKEND_URL`.
const imageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || backendUrl)
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: imageHosts.map((host) => {
      const url = new URL(host);
      return {
        protocol: url.protocol === "https:" ? "https" : "http",
        hostname: url.hostname,
        port: url.port || "",
        pathname: "/**",
      };
    }),
  },
};

export default nextConfig;
