"use client";

import {
  EnvelopeClosedIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import { Flex } from "@radix-ui/themes";
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
        <Flex align="center" gap="2">
          <PersonIcon width={14} height={14} />
          contacts
        </Flex>
      </NavLink>

      <NavLink href="/admin/emails" title="Emails">
        <Flex align="center" gap="2">
          <EnvelopeClosedIcon width={14} height={14} />
          emails
        </Flex>
      </NavLink>
    </>
  );
}
