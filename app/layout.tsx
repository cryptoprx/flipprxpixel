import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FLIPPRX Pixel Game - Retro Platformer with 3 Unique Characters | Play Now",
  description: "Experience FLIPPRX Pixel Game - An addictive retro platformer featuring 3 unique characters with special abilities. Classic speedster, air-sliding racer, and ground-slamming powerhouse. 10 challenging stages, power-ups, enemies, and pixel-perfect gameplay. Play the ultimate Game Boy-style adventure now!",
  keywords: "FLIPPRX pixel game, retro platformer, gameboy game, pixel art game, mobile platformer, retro gaming, 8-bit game, classic platformer, pixel game online, free browser game, nostalgic game, mario-style game, character abilities, speedster character, slam attack, air slide, retro game 2025, flipprx one, pixel adventure, arcade platformer, touch controls game",
  authors: [{ name: "FLIPPRX" }],
  creator: "FLIPPRX",
  publisher: "FLIPPRX",
  applicationName: "FLIPPRX Pixel Game",
  category: "game",
  classification: "Retro Platformer Game",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://flipprxpixel.vercel.app',
    title: 'FLIPPRX Pixel Game - 3 Characters, 10 Stages, Pure Retro Fun 🎮',
    description: '🕹️ Play the ultimate retro platformer! Choose from 3 unique characters - Classic hero, Speedster with air slide, or Slammer with ground pound. 10 challenging stages packed with enemies, coins, and power-ups. Free to play now!',
    siteName: 'FLIPPRX Pixel Game',
    images: [
      {
        url: 'https://flipprxpixel.vercel.app/banner.png',
        width: 1200,
        height: 630,
        alt: 'FLIPPRX Pixel Game - Retro platformer with 3 unique characters in Game Boy style',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@flipprx',
    creator: '@flipprx',
    title: 'FLIPPRX Pixel Game - 3 Characters, 10 Stages 🎮',
    description: '🕹️ Ultimate retro platformer! Choose your character: Classic, Speedster (air slide), or Slammer (ground pound). 10 stages of pixel-perfect action. Play now! 👾',
    images: [
      {
        url: 'https://flipprxpixel.vercel.app/banner.png',
        alt: 'FLIPPRX Pixel Game - Retro platformer gameplay',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/icon.png',
  },
  manifest: '/manifest.json',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'theme-color': '#000000',
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
