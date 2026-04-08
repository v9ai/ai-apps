"use client";

import {
  EnvelopeClosedIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import { flex } from "styled-system/patterns";
import { authClient } from "@/lib/auth/client";
import { NavLink } from "@/components/ui";
import { ADMIN_EMAIL } from "@/lib/constants";

export function AdminNav() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending || !session) return null;

  const isAdmin = session.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (!isAdmin) return null;

  return (
    <>
      <NavLink href="/admin/contacts" title="Contacts">
        <div className={flex({ align: "center", gap: "2" })}>
          <PersonIcon width={14} height={14} />
          contacts
        </div>
      </NavLink>

      <NavLink href="/admin/emails" title="Emails">
        <div className={flex({ align: "center", gap: "2" })}>
          <EnvelopeClosedIcon width={14} height={14} />
          emails
        </div>
      </NavLink>
    </>
  );
}
