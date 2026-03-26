import { render } from "@react-email/components";
import React from "react";
import { VadimSignature } from "./signature-react";

let cachedSignature: string | null = null;

async function getRenderedSignature(): Promise<string> {
  if (!cachedSignature) {
    cachedSignature = await render(React.createElement(VadimSignature));
  }
  return cachedSignature;
}

export let vadimSignature = "";

getRenderedSignature().then((html) => {
  vadimSignature = html;
});

export async function getVadimSignature(): Promise<string> {
  return getRenderedSignature();
}

export const defaultSignature = vadimSignature;
