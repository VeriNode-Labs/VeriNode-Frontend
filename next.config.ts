import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

// Content-Security-Policy as defense-in-depth for issue #9. The app is
// statically pre-rendered, so a per-request nonce can't be embedded; inline
// scripts (Next's hydration bootstrap) therefore require 'unsafe-inline'.
// 'unsafe-eval' is added only in development for Turbopack HMR. The directives
// the issue calls out are enforced in production: object-src 'none' blocks
// plugins, and script-src is restricted to 'self' (no remote script origins).
// `upgrade-insecure-requests` is omitted so http://localhost keeps working.
const isProd = process.env.NODE_ENV === "production";
const scriptSrc = isProd ? "'self' 'unsafe-inline'" : "'self' 'unsafe-inline' 'unsafe-eval'";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https: wss: ws:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (`.next/standalone`) so the Docker
  // image only ships the minimal runtime artifacts instead of `node_modules`.
  // This keeps the final layer small and lets `docker build` cache layers that
  // are unaffected by source-only changes. See issue #167.
  output: "standalone",
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
    {
      source: "/sw.js",
      headers: [
        {
          key: "Content-Type",
          value: "application/javascript; charset=utf-8",
        },
        {
          key: "Cache-Control",
          value: "no-cache, no-store, must-revalidate",
        },
      ],
    },
    {
      source: "/icons/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ],
};

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig);
