"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Flex, TabNav, Text } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useGetCompanyQuery } from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/contacts", label: "Contacts" },
  { href: "/emails", label: "Emails" },
  { href: "/posts", label: "Posts" },
  { href: "/campaigns", label: "Campaigns" },
] as const;

export function CompanyChrome({ companyKey }: { companyKey: string }) {
  const pathname = usePathname() ?? "";
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data } = useGetCompanyQuery({
    variables: { key: companyKey },
    skip: !isAdmin,
  });
  const company = data?.company;

  const base = `/companies/${companyKey}`;
  const onOverview = pathname === base;

  return (
    <Box mb="4">
      {!onOverview && (
        <Link href={base} style={{ textDecoration: "none" }}>
          <Flex align="center" gap="1" mb="3">
            <ArrowLeftIcon />
            <Text size="2" color="gray">
              {company?.name ?? "Back"}
            </Text>
          </Flex>
        </Link>
      )}

      <TabNav.Root>
        {TABS.map(({ href, label }) => {
          const target = `${base}${href}`;
          const active = href === "" ? onOverview : pathname === target || pathname.startsWith(`${target}/`);
          return (
            <TabNav.Link key={href} asChild active={active}>
              <Link href={target}>{label}</Link>
            </TabNav.Link>
          );
        })}
      </TabNav.Root>
    </Box>
  );
}
