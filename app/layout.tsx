import type { Metadata, Viewport } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.flipprx.app"),
  title: "FLIPPRX Pixel Game - Retro Platformer with 3 Unique Heroes & Boss Fights",
  description:
    "Experience FLIPPRX Pixel Game — an arcade pixel platformer featuring 3 unique heroes (Classic, Speedster, Slammer), 4 atmospheric biomes, 10 stages, power-ups, and epic Boss Battles against Emperor Viper and Overlord Rektus!",
  keywords:
    "FLIPPRX pixel game, retro platformer, pixel art game, mobile platformer, Android arcade game, 8-bit game, boss fight platformer, flipprx",
  authors: [{ name: "FLIPPRX" }],
  creator: "FLIPPRX",
  publisher: "FLIPPRX",
  applicationName: "FLIPPRX Pixel Game",
  category: "game",
  classification: "Retro Platformer Game",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.flipprx.app",
    title: "FLIPPRX Pixel Game - 3 Heroes, 10 Stages & Epic Bosses 🎮",
    description:
      "🕹️ Choose Classic, Speedster, or Slammer across 10 stages, 4 biomes, and epic pixel Boss Battles. Play free on Mobile, Android & Desktop!",
    siteName: "FLIPPRX Pixel Game",
    images: [
      {
        url: "https://www.flipprx.app/icon-512.png",
        width: 512,
        height: 512,
        alt: "FLIPPRX Pixel Game",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@flipprx",
    creator: "@flipprx",
    title: "FLIPPRX Pixel Game - 3 Heroes, 10 Stages & Epic Bosses 🎮",
    description:
      "🕹️ Choose Classic, Speedster, or Slammer across 10 stages and defeat Overlord Rektus!",
    images: [
      {
        url: "https://www.flipprx.app/icon-512.png",
        alt: "FLIPPRX Pixel Game",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "16x16", type: "image/png" },
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/icon.png",
  },
  manifest: "/manifest.json",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${pixelFont.variable}`}
        style={{ fontFamily: "var(--font-pixel), monospace" }}
      >
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
