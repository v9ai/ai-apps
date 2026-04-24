import { Suspense } from "react";
import { ProductIcpPage } from "../../components/product-icp-page";
import { LoadingShell } from "../../components/view-chrome";

type Params = { slug: string };

export default async function ProductIcpRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<LoadingShell />}>
      <ProductIcpPage slug={slug} />
    </Suspense>
  );
}
