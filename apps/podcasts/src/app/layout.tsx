import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Humans of AI",
  description:
    "Intimate portraits of the minds building artificial intelligence — their stories, their words, their vision.",
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
      </head>
      <body className={`${inter.variable} bg-[#0B0B0F] text-[#E8E8ED] font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
