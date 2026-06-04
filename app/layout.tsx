import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});
const siteTitle = "Anayamkunnu Sector Sahityotsav";
const siteDescription =
  "Official Anayamkunnu Sector Sahityotsav app for results, posters, and event updates.";
const logoPath = "/SAHITYOTSAV LOGO.png";


export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    images: [
      {
        url: logoPath,
        width: 1200,
        height: 1200,
        alt: "Anayamkunnu Sector Sahityotsav logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [logoPath],
  },
  icons: {
    icon: [
      { url: logoPath, type: "image/png" },
      { url: logoPath, sizes: "32x32", type: "image/png" },
      { url: logoPath, sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: logoPath, sizes: "180x180", type: "image/png" }],
    shortcut: [logoPath],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
