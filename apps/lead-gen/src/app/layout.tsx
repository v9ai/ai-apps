import type { Metadata } from "next";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import { Theme, Flex } from "@radix-ui/themes";
import { Providers } from "@/components/providers";
import { SidebarProvider } from "@/components/sidebar-provider";
import { Sidebar, MainContent } from "@/components/sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agentic Lead Gen — Autonomous B2B Lead Generation Pipeline",
  description:
    "Autonomous AI agents discover, enrich, score, and deliver qualified B2B leads end-to-end. Open-source, local-first, $1,500/year vs $13,200 cloud. 35 cited papers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <a href="#main-content" className="skip-to-content">
          skip to content
        </a>
        <Theme appearance="dark" radius="medium">
          <Providers>
            <ErrorBoundary>
              <SidebarProvider>
                <Flex minHeight="100vh">
                  <Sidebar />
                  <MainContent>{children}</MainContent>
                </Flex>
              </SidebarProvider>
            </ErrorBoundary>
          </Providers>
        </Theme>
      </body>
    </html>
  );
}
