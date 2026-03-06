"use client";

import {
  ExclamationTriangleIcon,
  EnvelopeClosedIcon,
  GearIcon,
  PersonIcon,
  TargetIcon,
  CheckboxIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { Flex } from "@radix-ui/themes";
import { useUser } from "@clerk/nextjs";
import { NavLink } from "@/components/ui";
import { ADMIN_EMAIL } from "@/lib/constants";

export function AdminNav() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded || !isSignedIn) return null;

  const userEmail =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress;
  const isAdmin = userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (!isAdmin) return null;

  return (
    <>
      <NavLink href="/admin/contacts" title="Contacts">
        <Flex align="center" gap="2">
          <PersonIcon width={14} height={14} />
          contacts
        </Flex>
      </NavLink>
      <NavLink href="/admin/opportunities" title="Opportunities">
        <Flex align="center" gap="2">
          <TargetIcon width={14} height={14} />
          opportunities
        </Flex>
      </NavLink>
      <NavLink href="/admin/tasks" title="Tasks">
        <Flex align="center" gap="2">
          <CheckboxIcon width={14} height={14} />
          tasks
        </Flex>
      </NavLink>
      <NavLink href="/admin/emails" title="Emails">
        <Flex align="center" gap="2">
          <EnvelopeClosedIcon width={14} height={14} />
          emails
        </Flex>
      </NavLink>
      <NavLink href="/admin/blocked-companies" title="Blocked Companies">
        <Flex align="center" gap="2">
          <Cross2Icon width={14} height={14} />
          blocked
        </Flex>
      </NavLink>
      <NavLink href="/admin/reported-jobs" title="Reported jobs review">
        <Flex align="center" gap="2">
          <ExclamationTriangleIcon width={14} height={14} style={{ color: "var(--orange-9)" }} />
          reported
        </Flex>
      </NavLink>
      <NavLink href="/admin/workers" title="Workers">
        <Flex align="center" gap="2">
          <GearIcon width={14} height={14} />
          workers
        </Flex>
      </NavLink>
    </>
  );
}
