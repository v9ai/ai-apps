import { Suspense } from "react";
import { CompaniesList } from "@/components/companies-list";

export default function DashboardPage() {
  return (
    <Suspense>
      <CompaniesList />
    </Suspense>
  );
}
