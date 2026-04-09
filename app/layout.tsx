import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10b981",
};

export const metadata: Metadata = {
  title: {
    default: "LandKoala - Free Location Intelligence for Business Site Selection",
    template: "%s | LandKoala",
  },
  description:
    "Evaluate business locations with free geospatial data. Score underserved retail spots using Census demographics and OpenStreetMap competition data. Find the best location for your coffee shop, restaurant, gym, or retail store.",
  keywords: [
    "business location analysis",
    "site selection",
    "retail location intelligence",
    "demographic data",
    "competitor analysis",
    "census data",
    "openstreetmap",
    "market research",
    "business planning",
    "store locator",
    "commercial real estate",
    "small business tools",
    "free location data",
    "business scoring",
    "market suitability",
  ],
  authors: [{ name: "LandKoala" }],
  creator: "LandKoala",
  publisher: "LandKoala",
  metadataBase: new URL("https://landkoala.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://landkoala.com",
    siteName: "LandKoala",
    title: "LandKoala - Free Location Intelligence for Business Site Selection",
    description:
      "Score underserved store locations with free Census and OpenStreetMap data. Find the perfect spot for your business.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LandKoala - Business Location Intelligence Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LandKoala - Free Location Intelligence for Business Site Selection",
    description:
      "Score underserved store locations with free Census and OpenStreetMap data.",
    images: ["/og-image.png"],
    creator: "@landkoala",
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
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="dns-prefetch" href="https://api.census.gov" />
        <link rel="dns-prefetch" href="https://overpass-api.de" />
        <link rel="dns-prefetch" href="https://nominatim.openstreetmap.org" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "LandKoala",
              description:
                "Free location intelligence tool for business site selection using Census and OpenStreetMap data",
              url: "https://landkoala.com",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Any",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              featureList: [
                "Geographic market analysis",
                "Competitor mapping",
                "Demographic scoring",
                "Business location recommendations",
                "Interactive mapping",
              ],
              author: {
                "@type": "Organization",
                name: "LandKoala",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
