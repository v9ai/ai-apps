import { LoginForm } from "@/components/login-form";
import { Flex } from "@radix-ui/themes";

export default function Page() {
  return (
    <Flex align="center" justify="center" style={{ minHeight: "100svh", padding: "var(--space-5)" }}>
      <LoginForm />
    </Flex>
  );
}
