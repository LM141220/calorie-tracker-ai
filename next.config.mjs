import withPWAInit from "@ducanh2912/next-pwa";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);
const buildDate = new Date().toISOString();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseImageRemotePattern = supabaseUrl ? new URL(supabaseUrl) : null;

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: false,
  cacheStartUrl: false,
  reloadOnOnline: false,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ request, url }) =>
          request.mode === "navigate" &&
          /^\/(?:dashboard|history)\/?$/.test(url.pathname),
        method: "GET",
        handler: "NetworkFirst",
        options: {
          cacheName: "calorie-tracker-ai-private-pages",
          networkTimeoutSeconds: 3,
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [200],
          },
        },
      },
    ],
  },
});

/** @type {import("next").NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_BUILD_DATE: buildDate,
  },
  async headers() {
    return [
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, must-revalidate",
          },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, must-revalidate",
          },
        ],
      },
    ];
  },
  reactStrictMode: true,
  images: {
    remotePatterns: supabaseImageRemotePattern
      ? [
          {
            protocol: supabaseImageRemotePattern.protocol.slice(0, -1),
            hostname: supabaseImageRemotePattern.hostname,
            port: supabaseImageRemotePattern.port,
            pathname: "/storage/v1/object/sign/meal-images/**",
          },
        ]
      : [],
  },
};

export default withPWA(nextConfig);
