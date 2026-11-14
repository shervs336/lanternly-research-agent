import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  // Absolute base for social preview images. Matches the Vercel project name.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://lanternly-research-agent.vercel.app"),
  title: "Lanternly: research that shows its work",
  description:
    "Ask a question. Lanternly plans, searches the web, reads the sources and writes a cited report while you watch every step.",
  openGraph: {
    title: "Lanternly: AI research that shows its work",
    description: "Watch an AI agent plan, search, read and write a cited report.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#0a0f1c" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} antialiased`}>
      <body className="min-h-dvh">
        <Suspense fallback={<SiteHeader.Fallback />}>
          <SiteHeader />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
