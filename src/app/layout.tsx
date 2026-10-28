import type { Metadata, Viewport } from "next";
import { Literata, Source_Sans_3 } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeColorSync } from "@/components/layout/theme-color";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

// Fonts are downloaded at build time and served from this site (no requests to other sites).
/** Source Sans 3: a warm, open humanist sans for everything you operate, with plain figures (no slashed zero). */
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source-sans", display: "swap" });
/** Literata was designed for long-form reading on screens: scripture, titles, and reflections. */
const literata = Literata({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-literata",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Gospel Labs",
    template: "%s · Gospel Labs",
  },
  description:
    "Study the scriptures and come to know Jesus Christ. Guided, interactive investigations, a Scripture Explorer, and a private notebook of your discoveries—all on your own device.",
  applicationName: "Gospel Labs",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Gospel Labs", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Kept in step with the chosen theme by <ThemeColorSync />.
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${sourceSans.variable} ${literata.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
        <ThemeColorSync />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
