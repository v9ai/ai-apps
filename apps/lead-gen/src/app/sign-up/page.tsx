"use client";

import { Container, Flex } from "@radix-ui/themes";
import { AuthDialog } from "@/components/AuthDialog";
import { useEffect, useState } from "react";

export default function SignUpPage() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(true);
  }, []);

  return (
    <Container size="1" px="4" py="8">
      <Flex direction="column" gap="6" align="center">
        <AuthDialog open={open} onOpenChange={setOpen} defaultMode="signup" />
      </Flex>
    </Container>
  );
}
