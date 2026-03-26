import React, { Suspense } from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import type { FlowDiagramProps } from "./FlowDiagram";

const FlowDiagram = React.lazy(() => import("./FlowDiagram"));

const fallback = (height = 400) => (
  <div
    style={{
      height,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--ifm-background-surface-color)",
      borderRadius: 8,
      color: "var(--ifm-color-content-secondary)",
    }}
  >
    Loading diagram…
  </div>
);

export default function Flow(props: FlowDiagramProps) {
  return (
    <BrowserOnly fallback={fallback(props.height)}>
      {() => (
        <Suspense fallback={fallback(props.height)}>
          <FlowDiagram {...props} />
        </Suspense>
      )}
    </BrowserOnly>
  );
}
