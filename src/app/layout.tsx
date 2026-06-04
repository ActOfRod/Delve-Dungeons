import type { Metadata, Viewport } from "next";
import { Cinzel, Geist } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cinzel",
});

export const metadata: Metadata = {
  title: "Delve Dungeons — AI-powered tabletop adventures",
  description:
    "Play Dungeons & Dragons online with an AI Dungeon Master. Real-time campaigns for people too busy to meet up in person.",
  applicationName: "Delve Dungeons",
  appleWebApp: {
    capable: true,
    title: "Delve Dungeons",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0a12",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${cinzel.variable}`}>
      <body className="font-body antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
