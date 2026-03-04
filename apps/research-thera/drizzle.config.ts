import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId:
      process.env.CLOUDFLARE_ACCOUNT_ID || "a036f50e02431c89170b8f977e982a3d",
    databaseId:
      process.env.CLOUDFLARE_DATABASE_ID ||
      "52b7dab0-7027-4e9e-ae30-f719bdfff993",
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
} satisfies Config;
