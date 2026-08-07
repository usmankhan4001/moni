import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg", "drizzle-orm"],
  turbopack: {},
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-inline' is REQUIRED here, not an oversight. Next.js
              // streams its RSC payload through inline <script> tags
              // (self.__next_f.push(...)), and next-themes injects an inline
              // no-flash script. Without this they are refused by the browser,
              // React never hydrates, and every form on the site is inert —
              // pages render correctly but buttons silently do nothing.
              //
              // The stricter fix is a per-request nonce, but Next.js can only
              // inject one into dynamically rendered routes, and /login and
              // /signup are "use client" pages that Next prerenders as static.
              // Serving them with a nonce means converting both into server
              // wrappers around client forms and threading the nonce through
              // next-themes. Worth doing; see README "Hardening the CSP".
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "worker-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
