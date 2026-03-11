import { render } from "@react-email/components";
import React from "react";
import {
  EmailSignature,
  VadimSignature,
  type SignatureConfig,
} from "./signature-react";

export async function renderSignature(config: SignatureConfig): Promise<string> {
  return await render(React.createElement(EmailSignature, config));
}

export async function renderVadimSignature(): Promise<string> {
  return await render(React.createElement(VadimSignature));
}
