import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Footer from "./_components/footer";
import { SearchModal } from "./_components/search-modal";
import { css } from "styled-system/css";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://humansofai.space"),
  title: {
    default: "Humans of AI",
    template: "%s | Humans of AI",
  },
  description:
    "Intimate portraits of the minds building artificial intelligence — their stories, their words, their vision.",
  keywords: [
    "AI researchers",
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "AI leaders",
    "tech founders",
    "AI podcast",
    "AI interviews",
    "Dario Amodei",
    "Geoffrey Hinton",
    "Yann LeCun",
    "Ilya Sutskever",
    "Jensen Huang",
    "Mustafa Suleyman",
    "AI builders",
    "AI visionaries",
    "neural networks",
    "large language models",
    "LLM",
    "generative AI",
  ],
  authors: [{ name: "Humans of AI", url: "https://humansofai.space" }],
  creator: "Humans of AI",
  publisher: "Humans of AI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "https://humansofai.space",
    types: {
      "application/rss+xml": "https://humansofai.space/feed.xml",
      "application/feed+json": "https://humansofai.space/feed.json",
    },
  },
  openGraph: {
    title: "Humans of AI",
    description:
      "Intimate portraits of the minds building artificial intelligence — their stories, their words, their vision.",
    siteName: "Humans of AI",
    locale: "en_US",
    type: "website",
    url: "https://humansofai.space",
  },
  twitter: {
    card: "summary_large_image",
    title: "Humans of AI",
    description:
      "Intimate portraits of the minds building artificial intelligence — their stories, their words, their vision.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/favicon/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon/favicon-16x16.png"
        />
        <link rel="manifest" href="/favicon/site.webmanifest" />
        <link
          rel="shortcut icon"
          href="/favicon/favicon.ico"
        />
        <meta name="theme-color" content="#0B0B0F" />
        <link rel="alternate" type="application/rss+xml" title="Humans of AI RSS Feed" href="/feed.xml" />
        <link rel="alternate" type="application/feed+json" title="Humans of AI JSON Feed" href="/feed.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Humans of AI",
              description:
                "Intimate portraits of the minds building artificial intelligence",
              url: "https://humansofai.space",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate:
                    "https://humansofai.space/?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body className={`${inter.variable} ${css({ bg: 'ui.base', color: 'ui.heading', fontFamily: 'sans' })}`}>
        <a
          href="#main-content"
          className={css({
            srOnly: true,
            _focus: {
              srOnly: false,
              pos: 'absolute',
              zIndex: 50,
              px: '4',
              py: '2',
              bg: 'white',
              color: 'black',
              fontSize: 'sm',
              fontWeight: 'medium',
              rounded: 'md',
              m: '2',
            },
          })}
        >
          Skip to content
        </a>
        <SearchModal />
        <div id="main-content">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
