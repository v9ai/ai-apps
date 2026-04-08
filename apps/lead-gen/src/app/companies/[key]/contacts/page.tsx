import { Suspense } from "react";
import { css } from "styled-system/css";
import { Spinner } from "@/components/ui/Spinner";
import { CompanyContactsClient } from "./contacts-client";

type Props = {
  params: Promise<{ key: string }>;
};

export default async function CompanyContactsPage({ params }: Props) {
  const { key } = await params;

  return (
    <Suspense
      fallback={
        <div className={css({ maxWidth: "1200px", mx: "auto", p: "8" })}>
          <div className={css({ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" })}>
            <Spinner size={20} />
          </div>
        </div>
      }
    >
      <CompanyContactsClient companyKey={key} />
    </Suspense>
  );
}
