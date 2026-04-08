"use client";

import { GearIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { Button } from "@/components/ui";
import { authClient } from "@/lib/auth/client";
import { AuthDialog } from "@/components/AuthDialog";

export function AuthHeader() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <span className={css({ fontSize: "xs", color: "ui.tertiary", px: "1" })}>
        …
      </span>
    );
  }

  if (!session) {
    return (
      <div className={flex({ direction: "column", gap: "2" })}>
        <AuthDialog
          trigger={
            <Button variant="ghost" size="sm" style={{ width: "100%" }}>
              sign in
            </Button>
          }
          defaultMode="signin"
        />
        <AuthDialog
          trigger={
            <Button variant="solid" size="sm" style={{ width: "100%" }}>
              sign up
            </Button>
          }
          defaultMode="signup"
        />
      </div>
    );
  }

  const displayName = session.user.name || session.user.email;

  return (
    <div className={flex({ direction: "column", gap: "2" })}>
      <span
        className={css({
          fontSize: "xs",
          color: "ui.tertiary",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        })}
        title={displayName ?? undefined}
      >
        {displayName}
      </span>
      <div className={flex({ align: "center", gap: "2" })}>
        <Link
          href="/settings"
          className={css({ display: "flex", alignItems: "center" })}
        >
          <GearIcon width={14} height={14} className={css({ color: "ui.tertiary" })} />
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => authClient.signOut()}
        >
          sign out
        </Button>
      </div>
    </div>
  );
}
