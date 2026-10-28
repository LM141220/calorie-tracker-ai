import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { NavigationProfiler } from "@/components/performance/navigation-profiler";
import { QueryProvider } from "@/components/query-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Lumo",
    template: "%s | Lumo",
  },
  description: "Suis simplement tes repas et ton objectif quotidien avec Lumo.",
  applicationName: "Lumo",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lumo",
  },
  icons: {
    icon: [
      { url: "/icons/lumo-logo.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#24563d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <QueryProvider>
          <NavigationProfiler />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
