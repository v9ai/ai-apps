import { Container } from "@radix-ui/themes";

export default function ConstrainedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Container size="3" pb="6" px={{ initial: "3", md: "5" }}>
      {children}
    </Container>
  );
}
