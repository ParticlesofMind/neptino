import type { Metadata } from "next";
import { Geist, Geist_Mono, Open_Sans } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeTokensProvider } from "@/components/providers/ThemeTokensProvider";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "@xyflow/react/dist/style.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  preload: false,
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Neptino",
  description: "Neptino learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${openSans.variable} antialiased`}
      >
        <ThemeTokensProvider />
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
