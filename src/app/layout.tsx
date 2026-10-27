import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Calorie Tracker AI",
    template: "%s | Calorie Tracker AI",
  },
  description:
    "Suivez vos repas et vos objectifs nutritionnels avec Calorie Tracker AI.",
  applicationName: "Calorie Tracker AI",
};

export const viewport: Viewport = {
  themeColor: "#16734b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
