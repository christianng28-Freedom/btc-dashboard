import type { NextConfig } from "next";

// The dashboard is served through the METIS site at
// https://www.metisaihk.com/demo/dashboard (vercel.json rewrite in the
// ai-tutoring repo proxies that path to this deployment). basePath keeps
// every page, asset and API route under the /demo/dashboard prefix so the
// proxy needs only one rule.
// Rewrites that opt out of basePath must point at an absolute URL, so the
// bare-/api mapping proxies to this deployment itself (localhost in dev).
const selfOrigin =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://btc-dashboard-five.vercel.app";

const nextConfig: NextConfig = {
  basePath: "/demo/dashboard",
  async rewrites() {
    return [
      // Client hooks fetch('/api/...') with absolute paths; basePath doesn't
      // touch fetch() calls, so map bare /api/* back under the prefix on any host.
      { source: "/api/:path*", destination: `${selfOrigin}/demo/dashboard/api/:path*`, basePath: false },
    ];
  },
  async redirects() {
    return [
      // Old pre-basePath URLs (shared links, bookmarks) land on the new paths.
      { source: "/", destination: "/demo/dashboard", basePath: false, permanent: false },
      { source: "/global/:path*", destination: "/demo/dashboard/global/:path*", basePath: false, permanent: false },
      { source: "/bitcoin/:path*", destination: "/demo/dashboard/bitcoin/:path*", basePath: false, permanent: false },
      { source: "/desk/:path*", destination: "/demo/dashboard/desk/:path*", basePath: false, permanent: false },
      { source: "/morning-brief/:path*", destination: "/demo/dashboard/morning-brief/:path*", basePath: false, permanent: false },
    ];
  },
};

export default nextConfig;
