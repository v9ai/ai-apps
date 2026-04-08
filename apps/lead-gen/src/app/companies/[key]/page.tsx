import { Suspense } from "react";
import { CompanyDetailProvider } from "@/components/company-detail-provider";
import { css } from "styled-system/css";
import { Spinner } from "@/components/ui/Spinner";

type Props = {
  params: Promise<{ key: string }>;
};

export default async function CompanyPage({ params }: Props) {
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
      <CompanyDetailProvider companyKey={key} />
    </Suspense>
  );
}
