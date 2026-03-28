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
  title: "Agentic Lead Gen — AI-Powered B2B Lead Generation",
  description:
    "Autonomous AI agents for B2B prospecting, company enrichment, contact discovery, and personalized outreach at scale.",
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
        <Theme appearance="dark">
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
