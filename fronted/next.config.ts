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
  webpack: (config, { isServer }) => {
    // Support for Web Workers
    if (!isServer) {
      config.output = config.output || {}
      config.output.publicPath = config.output.publicPath || '/_next/'
    }
    return config
  },
  allowedDevOrigins: (() => {
    const origins = new Set<string>([])
    const isProd = process.env.NODE_ENV === "production"

    if (!isProd) {
      origins.add("http://localhost:3000")
      origins.add("http://127.0.0.1:3000")
    }

    const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "")
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/:\d+$/, "")
      .replace(/\/+$/, "")

    if (rootDomain) {
      if (!isProd) {
        origins.add(`http://${rootDomain}:3000`)
        origins.add(`http://*.${rootDomain}:3000`)
      }
      origins.add(`https://${rootDomain}`)
      if (!isProd) {
        origins.add(`https://*.${rootDomain}`)
      }
    }

    if (isProd) {
      const extraOrigins = (process.env.NEXT_PUBLIC_ALLOWED_ORIGINS || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
      for (const origin of extraOrigins) {
        origins.add(origin)
      }
    }

    return Array.from(origins)
  })(),
  images: {
    domains: imageDomains,
    remotePatterns: imageUrls.map((url) => ({
      protocol: url.protocol === "https:" ? "https" : "http",
      hostname: url.hostname,
      port: url.port || "",
      pathname: "/**",
    })),
  },
  async redirects() {
    return [
      { source: "/contacto", destination: "/contact", permanent: true },
      { source: "/productos", destination: "/store", permanent: true },
    ];
  },
};

export default nextConfig;
