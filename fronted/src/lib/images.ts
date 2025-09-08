export function resolveImageUrl(path?: string): string {
  if (!path) return "";

  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

  // If it's an absolute URL, rewrite only if it's an uploads path
  // so we can recover from stale hosts/IPs stored in DB.
  if (path.startsWith("http")) {
    try {
      const url = new URL(path);
      if (url.pathname.startsWith("/uploads")) {
        const base = new URL(backend);
        url.protocol = base.protocol;
        url.hostname = base.hostname;
        url.port = base.port;
        return url.toString();
      }
      return path; // leave other absolute URLs intact
    } catch {
      // fallthrough and handle as relative below
    }
  }

  // Data URLs should be left intact
  if (path.startsWith("data:")) return path;

  // For app static assets like "/assets/...", do not prefix with backend
  if (path.startsWith("/assets") || path.startsWith("/icons") || path.startsWith("/placeholder.svg")) {
    return path;
  }

  // Prefix backend only for upload paths
  if (path.startsWith("/uploads")) return `${backend}${path}`;
  if (path.startsWith("uploads/")) return `${backend}/${path}`;

  // Otherwise return as-is
  return path;
}
