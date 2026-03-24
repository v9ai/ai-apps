import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { LangProvider, LanguageSwitcher, type Lang } from "@/components/LanguageSwitcher";
import "./globals.css";

export const metadata: Metadata = {
  // "Field Guide" evokes Monocle/Gestalten city guide series.
  // "Silesia's Capital" positions the city for non-Polish readers without
  // condescending explanation — it trusts curiosity. The em-dash is editorial
  // punctuation, not an SEO separator.
  // Template enables future per-place pages: "Nikiszowiec | Katowice"
  title: {
    default: "Katowice \u2014 A Field Guide to Silesia\u2019s Capital",
    template: "%s \u2014 Katowice",
  },
  description:
    "Ten essential places in Katowice, Poland \u2014 from the Spodek\u2019s flying-saucer silhouette to the red-brick courtyards of Nikiszowiec. A curated guide to Silesia\u2019s most surprising city.",
  openGraph: {
    title: "Katowice \u2014 A Field Guide to Silesia\u2019s Capital",
    description:
      "Ten essential places in Katowice: coal-mine museums, brutalist arenas, miners\u2019 settlements, and Silesian cuisine. Off the beaten path, worth every detour.",
    locale: "en_GB",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  const country = hdrs.get("x-vercel-ip-country") ?? "";
  const initialLang: Lang = country === "RO" ? "ro" : "en";

  return (
    <html lang={initialLang}>
      <body>
        <LangProvider initialLang={initialLang}>
          <LanguageSwitcher />
          {children}
        </LangProvider>
        <Analytics />
      </body>
    </html>
  );
}
