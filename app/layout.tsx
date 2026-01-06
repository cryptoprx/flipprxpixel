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
  title: "FLIPPRX Pixel Game - Retro Gameboy Style Platformer",
  description: "Play FLIPPRX Pixel Game - A retro-style platformer with authentic Game Boy aesthetics. Mobile-only gaming experience with touch controls. Jump, collect coins, and defeat enemies!",
  keywords: "FLIPPRX, pixel game, retro game, gameboy, platformer, mobile game, pixel art, retro gaming, flipprx one",
  authors: [{ name: "FLIPPRX" }],
  creator: "FLIPPRX",
  publisher: "FLIPPRX",
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
    title: 'FLIPPRX Pixel Game - Retro Gameboy Platformer',
    description: 'Play FLIPPRX Pixel Game - A retro-style platformer with authentic Game Boy aesthetics. Mobile-only gaming experience!',
    siteName: 'FLIPPRX Pixel Game',
    images: [
      {
        url: '/icon.png',
        width: 800,
        height: 600,
        alt: 'FLIPPRX Pixel Game Character',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FLIPPRX Pixel Game - Retro Gameboy Platformer',
    description: 'Play FLIPPRX Pixel Game - A retro-style platformer with authentic Game Boy aesthetics. Mobile-only gaming experience!',
    images: ['/icon.png'],
    creator: '@flipprx',
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
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/icon.png',
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
