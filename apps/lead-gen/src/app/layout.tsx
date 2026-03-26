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
  title: "Neural Lead Gen — AI-Powered Lead Generation Pipeline",
  description:
    "Identify high-intent hiring signals, enrich company data, and generate personalized outreach at scale with a multi-model AI pipeline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
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
