import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, Roboto_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Maria Chevskaya | Portrait and Editorial Photographer",
    template: "%s | Maria Chevskaya",
  },
  description:
    "Portrait and editorial photographer crafting luminous, cinematic stories for thoughtful brands and people.",
  openGraph: {
    type: "website",
    siteName: "Maria Chevskaya",
    locale: "en_US",
    title: "Maria Chevskaya | Portrait and Editorial Photographer",
    description:
      "Portrait and editorial photographer crafting luminous, cinematic stories for thoughtful brands and people.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Maria Chevskaya | Portrait and Editorial Photographer",
    description:
      "Portrait and editorial photographer crafting luminous, cinematic stories for thoughtful brands and people.",
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
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${robotoMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
