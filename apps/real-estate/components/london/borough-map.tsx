import dynamic from "next/dynamic";

export const BoroughMap = dynamic(
  () => import("./borough-map-inner").then((m) => m.BoroughMapInner),
  { ssr: false },
);
