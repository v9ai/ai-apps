/**
 * Runner for the competitor-mention detector.
 *
 * Usage:
 *   pnpm tsx scripts/detect-competitor-mentions.ts
 *   pnpm tsx scripts/detect-competitor-mentions.ts --product 42
 *   pnpm tsx scripts/detect-competitor-mentions.ts --companies 1,2,3
 */

import { detectCompetitorMentions } from "@/lib/intent/competitor-mention";

async function main() {
  const args = process.argv.slice(2);
  const productArg = args.find((a) => a === "--product");
  const productId = productArg
    ? parseInt(args[args.indexOf(productArg) + 1] ?? "", 10)
    : undefined;
  const companyArg = args.find((a) => a === "--companies");
  const companyIds = companyArg
    ? (args[args.indexOf(companyArg) + 1] ?? "")
        .split(",")
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isFinite(n))
    : undefined;

  const res = await detectCompetitorMentions({
    productIds: Number.isFinite(productId) ? [productId as number] : undefined,
    companyIds,
  });
  console.log(`Inserted ${res.inserted} competitor-mention signals`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
