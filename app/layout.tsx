import "./globals.css";

import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: "Neptino",
  description: "Interactive learning platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
