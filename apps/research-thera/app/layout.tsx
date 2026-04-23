import "@radix-ui/themes/styles.css";
import type { Metadata } from "next";
import { Box, Container, Theme } from "@radix-ui/themes";
import { ApolloProvider } from "./providers/ApolloProvider";
import { Header, SIDEBAR_WIDTH } from "./components/Header";
import { GlobalJournalShortcut } from "./components/GlobalJournalShortcut";
import { VaultShortcut } from "./components/VaultShortcut";

export const metadata: Metadata = {
  title: "ResearchThera.com",
  description: "Research-based therapeutic notes and reflections powered by AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <Theme
          appearance="dark"
          accentColor="indigo"
          grayColor="slate"
          radius="medium"
          scaling="100%"
        >
          <ApolloProvider>
            <Header />
            <GlobalJournalShortcut />
            <VaultShortcut />
            <Box
              style={{
                paddingLeft: `var(--sidebar-offset, 0px)`,
              }}
              pt={{ initial: "0", md: "5" }}
            >
              <Container size="3" pb="6" px={{ initial: "3", md: "5" }}>
                {children}
              </Container>
            </Box>
            <style>{`
              @media (min-width: 768px) {
                :root { --sidebar-offset: ${SIDEBAR_WIDTH}px; }
              }
            `}</style>
          </ApolloProvider>
        </Theme>
      </body>
    </html>
  );
}
