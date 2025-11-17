import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

// `NEXT_PUBLIC_IMAGE_HOSTS` can list extra allowed hosts separated by commas.
// If not provided, it falls back to `NEXT_PUBLIC_BACKEND_URL`.
const imageHostEntries = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || backendUrl)
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

const imageUrls = imageHostEntries
  .map((host) => {
    try {
      const normalized = host.includes("://") ? host : `https://${host}`;
      return new URL(normalized);
    } catch (error) {
      console.warn(
        `[next.config] Skipping invalid image host "${host}": ${String(error)}`
      );
      return null;
    }
  })
  .filter((url): url is URL => Boolean(url));

const imageDomains = Array.from(
  new Set(imageUrls.map((url) => url.hostname || "localhost"))
);

const skipStrictChecks = Boolean(
  process.env.SKIP_STRICT_BUILD === "true" ||
    process.env.SKIP_STRICT_BUILD === "1" ||
    process.env.RAILWAY_STATIC_URL ||
    process.env.RAILWAY_PROJECT_ID
);

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: skipStrictChecks,
  },
  typescript: {
    ignoreBuildErrors: skipStrictChecks,
  },
  images: {
    domains: imageDomains,
    remotePatterns: imageUrls.map((url) => ({
      protocol: url.protocol === "https:" ? "https" : "http",
      hostname: url.hostname,
      port: url.port || "",
      pathname: "/**",
    })),
  },
};

export default nextConfig;
