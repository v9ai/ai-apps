import { UpdatePasswordForm } from "@/components/update-password-form";
import { Flex } from "@radix-ui/themes";

export default function Page() {
  return (
    <Flex align="center" justify="center" style={{ minHeight: "100svh", padding: "var(--space-5)" }}>
      <UpdatePasswordForm />
    </Flex>
  );
}
