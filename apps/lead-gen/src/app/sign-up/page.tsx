"use client";

import { css } from "styled-system/css";
import { AuthDialog } from "@/components/AuthDialog";
import { useEffect, useState } from "react";

export default function SignUpPage() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(true);
  }, []);

  return (
    <div className={css({ maxWidth: "520px", mx: "auto", px: "4", py: "8" })}>
      <div className={css({ display: "flex", flexDirection: "column", gap: "6", alignItems: "center" })}>
        <AuthDialog open={open} onOpenChange={setOpen} defaultMode="signup" />
      </div>
    </div>
  );
}
