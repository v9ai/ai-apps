import { Box } from "@radix-ui/themes";

export default function FullWidthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Box pb="6" px={{ initial: "3", md: "5" }}>
      {children}
    </Box>
  );
}
