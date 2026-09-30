import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ViewTransition } from "react";
import "./globals.css";
import { InlineScript } from "@/components/inline-script";
import { PAGE_NAV } from "@/components/nav-link";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141712" },
  ],
  width: "device-width",
  initialScale: 1,
};

const THEME_SCRIPT = `try{var t=localStorage.getItem("safaisetu-theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.setAttribute("data-theme","dark")}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply the saved (or system) theme before first paint to avoid a flash */}
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body className="min-h-full">
        {/* Page navigations (Links tagged "page-nav", see components/nav-link) blur between pages (globals.css).
            Other transitions (live refreshes, server-action revalidations) update without animating. */}
        <ViewTransition default={{ [PAGE_NAV]: "page-blur", default: "none" }}>
          <div className="min-h-full">{children}</div>
        </ViewTransition>
      </body>
    </html>
  );
}
