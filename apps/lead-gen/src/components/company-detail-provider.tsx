"use client";

import { useSearchParams } from "next/navigation";
import { CompanyDetail } from "./company-detail";
import { CompanyDetailEditorial } from "./company-detail/variants/editorial";
import { CompanyDetailDashboard } from "./company-detail/variants/dashboard";
import { CompanyDetailAction } from "./company-detail/variants/action";

type Props = {
  companyKey: string;
};

export function CompanyDetailProvider({ companyKey }: Props) {
  const searchParams = useSearchParams();
  const ux = searchParams?.get("ux")?.toLowerCase() ?? null;

  const numericId = /^\d+$/.test(companyKey) ? parseInt(companyKey, 10) : null;
  const variantProps = numericId ? { companyId: numericId } : { companyKey };

  if (ux === "a" || ux === "editorial") {
    return <CompanyDetailEditorial {...variantProps} />;
  }
  if (ux === "b" || ux === "dashboard") {
    return <CompanyDetailDashboard {...variantProps} />;
  }
  if (ux === "c" || ux === "action") {
    return <CompanyDetailAction {...variantProps} />;
  }

  return <CompanyDetail {...variantProps} />;
}
