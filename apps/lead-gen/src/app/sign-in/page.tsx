"use client";

import { Container, Flex } from "@radix-ui/themes";
import { AuthDialog } from "@/components/AuthDialog";
import { useState } from "react";

export default function SignInPage() {
  const [open, setOpen] = useState(true);

  return (
    <Container size="1" px="4" py="8">
      <Flex direction="column" gap="6" align="center">
        <AuthDialog open={open} onOpenChange={setOpen} defaultMode="signin" />
      </Flex>
    </Container>
  );
}
