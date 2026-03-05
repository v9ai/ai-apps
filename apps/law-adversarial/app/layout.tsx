import { Box, Container, Flex, Heading, Separator, Theme } from "@radix-ui/themes";
import Link from "next/link";
import { Nav } from "./nav";
import "./globals.css";

export const metadata = {
  title: "Brief Stress-Tester",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Theme appearance="dark" accentColor="crimson" grayColor="sand" radius="large">
          <Box style={{ minHeight: "100vh" }}>
            <Box asChild style={{ borderBottom: "1px solid var(--gray-4)" }}>
              <header>
                <Container size="4" px="4">
                  <Flex justify="between" align="center" py="3">
                    <Heading size="4" asChild>
                      <Link href="/">Brief Stress-Tester</Link>
                    </Heading>
                  </Flex>
                  <Nav />
                </Container>
              </header>
            </Box>

            <Container size="3" px="4">
              {children}
            </Container>

            <Separator size="4" />
            <Flex justify="center" py="6">
              <Box style={{ fontSize: "var(--font-size-1)", color: "var(--gray-9)" }}>Brief Stress-Tester</Box>
            </Flex>
          </Box>
        </Theme>
      </body>
    </html>
  );
}
