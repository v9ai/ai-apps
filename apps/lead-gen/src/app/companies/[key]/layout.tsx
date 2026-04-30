import type { ReactNode } from "react";
import { Container } from "@radix-ui/themes";
import { CompanyChrome } from "./company-chrome";

type Props = {
  children: ReactNode;
  params: Promise<{ key: string }>;
};

function decodeKey(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default async function CompanyLayout({ children, params }: Props) {
  const { key: rawKey } = await params;
  const key = decodeKey(rawKey);
  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <CompanyChrome companyKey={key} />
      {children}
    </Container>
  );
}
