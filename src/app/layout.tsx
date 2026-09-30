import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, Sometype_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sometype = Sometype_Mono({
  variable: "--font-sometype",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: { default: "SafaiSetu — waste management for every society, campus and city", template: "%s · SafaiSetu" },
  description:
    "Report waste issues, request pickups and track every complaint to resolution. One platform connecting residents, campuses, public places and the municipality.",
  applicationName: "SafaiSetu",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable} ${sometype.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
