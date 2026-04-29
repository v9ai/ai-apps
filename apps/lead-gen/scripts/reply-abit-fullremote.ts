#!/usr/bin/env npx tsx
/**
 * One-off: ask Abit Technologies whether the Frontend Developer role
 * (listed as hybrid, 1 day/week in Bucharest) can be done full-remote.
 * No DB writes — single recruiter ping, not a campaign.
 * Dry-run by default. Pass --send to actually fire.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { Resend } from "resend";
import { FROM } from "@/lib/email/cpn-followup";

const TO = "office@abittechnologies.com";

const subject = "Frontend Developer — disponibilitate full remote?";

const text = `Salutare,

Am văzut anunțul pentru rolul de Frontend Developer (5+ ani, Angular/React, Micro Frontends, Lit.js/Astro, Redux/RxJS, Azure DevOps) și se potrivește cu profilul meu.

O singură întrebare înainte să aplic — anunțul menționează regim hibrid cu 1 zi/săptămână la birou în București. Ar fi posibil rolul în regim full-remote din România? Văd că BI Engineer e deja listat full-remote, așa că am vrut să întreb și pentru frontend.

Dacă e deschidere, pot trimite CV-ul și detalii.

Mulțumesc,
Vadim`;

async function main() {
  const send = process.argv.includes("--send");

  console.log(`\nFrom:    ${FROM}`);
  console.log(`To:      ${TO}`);
  console.log(`Subject: ${subject}`);
  console.log(`\n${text}\n`);

  if (!send) {
    console.log("(dry-run — pass --send to actually send)");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: FROM,
    to: TO,
    subject,
    text,
  });

  if (result.error) {
    console.error(`Failed: ${result.error.message}`);
    process.exit(1);
  }

  console.log(`Sent (resend_id=${result.data?.id ?? ""}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
