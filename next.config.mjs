import withPWAInit from "@ducanh2912/next-pwa";

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
  reactStrictMode: true,
};

export default withPWA(nextConfig);
