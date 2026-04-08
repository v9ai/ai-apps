import { CompaniesProvider } from "@/components/companies-provider";
import { Suspense } from "react";
import { css } from "styled-system/css";

export default function CompaniesPage() {
  return (
    <Suspense
      fallback={
        <div className={css({ maxWidth: "1200px", mx: "auto", p: "8" })}>
          <span className={css({ color: "ui.secondary", fontSize: "sm" })}>Loading...</span>
        </div>
      }
    >
      <CompaniesProvider />
    </Suspense>
  );
}
