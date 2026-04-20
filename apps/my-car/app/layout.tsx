import "@radix-ui/themes/styles.css";
import "./globals.css";
import { Theme } from "@radix-ui/themes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Car",
  description: "Track your cars, photos, and service history",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Theme appearance="dark" accentColor="cyan" radius="medium">
          {children}
        </Theme>
      </body>
    </html>
  );
}
