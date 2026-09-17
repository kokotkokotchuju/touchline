import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.SITE_URL?.trim() || "http://localhost:3000",
  ),
  title: {
    default: "Touchline — Every match. One place.",
    template: "%s | Touchline",
  },
  description:
    "Discover football matches and competitions from around the world. Explore the Touchline preview with illustrative fixtures and scores.",
  openGraph: {
    title: "Touchline — Every match. One place.",
    description:
      "Discover football matches and competitions from around the world.",
    type: "website",
    siteName: "Touchline",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
