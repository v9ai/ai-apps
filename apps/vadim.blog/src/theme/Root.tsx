import React from "react";
import { Theme } from "@radix-ui/themes";
import { Analytics } from "@vercel/analytics/react";
import "@radix-ui/themes/styles.css";

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <Theme
      appearance="dark"
      accentColor="teal"
      grayColor="slate"
      hasBackground={false}
    >
      {children}
      <Analytics />
    </Theme>
  );
}
