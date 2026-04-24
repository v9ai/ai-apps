import { Suspense } from "react";
import { ProductsList } from "./components/products-list";
import { LoadingShell } from "./components/view-chrome";

export default function ProductsPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <ProductsList />
    </Suspense>
  );
}
