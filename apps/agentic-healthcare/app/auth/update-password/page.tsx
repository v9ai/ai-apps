import { UpdatePasswordForm } from "@/components/update-password-form";
import { Logo } from "@/components/logo";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { css } from "styled-system/css";

const leftPanel = css({
  display: "none",
  "@media (min-width: 768px)": {
    display: "flex",
  },
  minHeight: "100vh",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "6",
  padding: "10",
  background:
    "linear-gradient(135deg, var(--indigo-2) 0%, var(--indigo-4) 100%)",
  backgroundSize: "cover",
  position: "relative",
  overflow: "hidden",
  _before: {
    content: '""',
    position: "absolute",
    inset: 0,
    backgroundImage:
      "radial-gradient(circle at 20% 30%, var(--indigo-6) 0%, transparent 55%), radial-gradient(circle at 80% 70%, var(--violet-5) 0%, transparent 50%)",
    opacity: 0.25,
  },
});

const rightPanel = css({
  minHeight: "100vh",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "5",
  flex: "1",
});

export default function Page() {
  return (
    <Flex style={{ minHeight: "100svh" }}>
      {/* Brand panel — desktop only */}
      <Box
        display={{ initial: "none", md: "flex" }}
        className={leftPanel}
        style={{ width: "42%", flexShrink: 0 }}
      >
        <Flex direction="column" align="center" gap="5" style={{ zIndex: 1 }}>
          <Logo size={64} />
          <Flex direction="column" align="center" gap="2">
            <Heading
              size="7"
              weight="bold"
              style={{ color: "var(--indigo-12)" }}
            >
              Agentic Healthcare
            </Heading>
            <Text size="3" style={{ color: "var(--indigo-11)" }} align="center">
              Your AI health companion
            </Text>
          </Flex>
        </Flex>
      </Box>

      {/* Form panel */}
      <Flex className={rightPanel}>
        <UpdatePasswordForm />
      </Flex>
    </Flex>
  );
}
