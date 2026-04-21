import type { Metadata } from "next";
import { cookies } from "next/headers";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import { Theme, Flex } from "@radix-ui/themes";
import { Providers } from "@/components/providers";
import { SidebarProvider } from "@/components/sidebar-provider";
import { TenantProvider } from "@/components/tenant-provider";
import { Sidebar, MainContent } from "@/components/sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DEFAULT_TENANT, TENANT_COOKIE, isTenantKey } from "@/lib/tenants";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const rawTenant = cookieStore.get(TENANT_COOKIE)?.value;
  const initialTenant = isTenantKey(rawTenant) ? rawTenant : DEFAULT_TENANT;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <Theme appearance="dark" radius="medium">
          <Providers>
            <ErrorBoundary>
              <SidebarProvider>
                <TenantProvider initialTenant={initialTenant}>
                  <Flex minHeight="100vh">
                    <Sidebar />
                    <MainContent>{children}</MainContent>
                  </Flex>
                </TenantProvider>
              </SidebarProvider>
            </ErrorBoundary>
          </Providers>
        </Theme>
      </body>
    </html>
  );
}
