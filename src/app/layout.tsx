import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ToastProvider } from "@/components/ui/toast";

const display = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-display-next",
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans-next",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

// Canonical origin for Open Graph images, canonical links and sitemaps.
// Set NEXT_PUBLIC_APP_URL per environment so preview builds don't advertise
// themselves as the live site.
const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pluggzofficial.co.uk";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pluggz | Shop what the UK's tastemakers actually plug",
    template: "%s · Pluggz",
  },
  description:
    "A curated directory of the creators you follow and the exact products they swear by. Discover it here, buy it at the brand.",
  keywords: [
    "Pluggz",
    "creator marketplace",
    "affiliate",
    "UK influencers",
    "creator storefronts",
    "shop the look",
  ],
  openGraph: {
    title: "Pluggz | Shop what the UK's tastemakers actually plug",
    description:
      "The curated directory of UK creators and the products they actually plug.",
    type: "website",
    siteName: "Pluggz",
  },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
    { media: "(prefers-color-scheme: light)", color: "#f6f2ec" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Set the theme before first paint to avoid a flash of the wrong theme.
const themeInit = `(function(){try{var t=localStorage.getItem('pluggz-theme');if(!t){t='night';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','night');}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="night"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
