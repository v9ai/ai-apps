import type { Metadata } from "next";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db, companies } from "@/db";
import { CompanyDetailProvider } from "@/components/company-detail-provider";
import { Spinner, Flex } from "@radix-ui/themes";
import { css } from "styled-system/css";

type Props = {
  params: Promise<{ key: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params;
  const [row] = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.key, key))
    .limit(1);
  if (!row) return { title: "Company not found — Agentic Lead Gen" };
  return { title: `${row.name} — Agentic Lead Gen` };
}

export default async function CompanyPage({ params }: Props) {
  const { key } = await params;

  return (
    <Suspense
      fallback={
        <Flex justify="center" align="center" className={css({ minHeight: "400px" })}>
          <Spinner size="3" />
        </Flex>
      }
    >
      <CompanyDetailProvider companyKey={key} />
    </Suspense>
  );
}
