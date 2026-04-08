"use client";

import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { Card, Badge } from "@/components/ui";

interface AdminBarProps {
  userEmail: string | null;
}

export function AdminBar({ userEmail }: AdminBarProps) {
  return (
    <Card padding="2" mb="2">
      <div className={flex({ align: "center", gap: "2" })}>
        <Badge variant="orange">admin</Badge>
        <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>{userEmail}</span>
      </div>
    </Card>
  );
}
