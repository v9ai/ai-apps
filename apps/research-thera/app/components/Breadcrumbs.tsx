"use client";
import { Flex, Text } from "@radix-ui/themes";
import Link from "next/link";
import { ChevronRightIcon } from "@radix-ui/react-icons";

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  crumbs: Crumb[];
}

export function Breadcrumbs({ crumbs }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb">
      <Flex align="center" gap="1" wrap="wrap">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <Flex key={i} align="center" gap="1">
              {i > 0 && (
                <ChevronRightIcon
                  width="14"
                  height="14"
                  color="var(--gray-9)"
                  aria-hidden="true"
                />
              )}
              {crumb.href && !isLast ? (
                <Link href={crumb.href} style={{ textDecoration: "none" }}>
                  <Text size="1" color="indigo">
                    {crumb.label}
                  </Text>
                </Link>
              ) : (
                <Text
                  size="1"
                  color="gray"
                  weight="medium"
                  aria-current={isLast ? "page" : undefined}
                >
                  {crumb.label}
                </Text>
              )}
            </Flex>
          );
        })}
      </Flex>
    </nav>
  );
}
