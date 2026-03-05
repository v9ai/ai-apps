import {
  Box,
  Container,
  Flex,
  Heading,
  Separator,
  Text,
  Theme,
} from "@radix-ui/themes";
import { Github, Shield } from "lucide-react";
import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "Brief Stress-Tester",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Theme
          appearance="dark"
          accentColor="crimson"
          grayColor="sand"
          radius="large"
        >
          <Box
            style={{
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <header className="nav-blur">
              <Container size="4" px="4">
                <Flex justify="between" align="center" py="2" gap="4">
                  {/* Brand */}
                  <Flex
                    align="center"
                    gap="3"
                    asChild
                    style={{ flexShrink: 0 }}
                  >
                    <Link href="/" style={{ textDecoration: "none" }}>
                      <Flex
                        align="center"
                        justify="center"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "var(--crimson-a3)",
                          border: "1px solid var(--crimson-a5)",
                        }}
                      >
                        <Shield
                          size={18}
                          style={{ color: "var(--crimson-9)" }}
                        />
                      </Flex>
                      <Heading size="4" style={{ color: "var(--crimson-11)" }}>
                        Brief Stress-Tester
                      </Heading>
                    </Link>
                  </Flex>

                  <a
                    href="https://github.com/nicolad/ai-apps/tree/main/apps/law-adversarial"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--gray-10)", display: "flex", alignItems: "center" }}
                  >
                    <Github size={20} />
                  </a>
                </Flex>
              </Container>
            </header>

            <Box style={{ flex: 1 }}>
              <Container size="3" px="4" py="6">
                {children}
              </Container>
            </Box>

            <Separator size="4" />
            <Flex direction="column" align="center" gap="1" py="6">
              <Text size="1" color="gray">
                Brief Stress-Tester
              </Text>
              <Text size="1" style={{ color: "var(--gray-8)" }}>
                Adversarial Legal Analysis
              </Text>
            </Flex>
          </Box>
        </Theme>
      </body>
    </html>
  );
}
