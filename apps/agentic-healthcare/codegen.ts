import type { CodegenConfig } from "@graphql-codegen/cli";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const config: CodegenConfig = {
  schema: {
    [`${supabaseUrl}/graphql/v1`]: {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    },
  },
  documents: ["lib/graphql/**/*.graphql"],
  generates: {
    "lib/graphql/generated.ts": {
      plugins: ["typescript", "typescript-operations", "typed-document-node"],
      config: {
        scalars: {
          UUID: "string",
          Datetime: "string",
          Date: "string",
          JSON: "Record<string, unknown>",
          BigInt: "string",
          BigFloat: "string",
          Opaque: "unknown",
          Cursor: "string",
        },
      },
    },
  },
};

export default config;
